import {AppBar, Box, Divider, IconButton, Menu, MenuItem, Toolbar, Typography} from "@mui/material";
import React, {useEffect} from "react";
import {Account} from "../../im/account";
import {SessionMessageList} from "./MessageList";
import {showSnack} from "../widget/SnackBar";
import {MessageInput, MessageInputV2} from "./MessageInput";
import {
    ArrowBack,
    DeleteOutlined,
    DescriptionOutlined,
    ExitToAppOutlined,
    MoreVertRounded,
    NotificationsOffOutlined
} from "@mui/icons-material";
import {Loading} from "../widget/Loading";
import {RouteComponentProps, useParams, withRouter} from "react-router-dom";
import {SessionListEventType} from "../../im/session_list";
import {catchError, filter, map, mergeMap, Observable, of, onErrorResumeNext, timeout} from "rxjs";
import {grey} from "@mui/material/colors";
import {Session} from "../../im/session";


function typingEvent(session: Session): Observable<boolean> {
    return onErrorResumeNext(
        session.inputEvent.pipe(
            map((v) => true),
            timeout(1500),
            catchError((e) => of(false)),
        ),
        of(false).pipe(
            mergeMap((v) => typingEvent(session))
        )
    )
}

function SessionTitleBar(props: { session: Session }) {

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [typing, setTyping] = React.useState(false);

    const handleCleanMessage = () => {
        props.session.clearMessageHistory().subscribe({
            next: (v) => {
                showSnack("消息已清理")
            },
            error: (e) => {
                showSnack("清理消息失败")
            }
        })
        setAnchorEl(null);
    }

    useEffect(() => {
        const subscribe = typingEvent(props.session).subscribe({
            next: (v) => {
                setTyping(v)
            }
        });
        return () => subscribe.unsubscribe()
    }, [props.session])

    const handleExit = () => {
        setAnchorEl(null);
    }

    const handleMute = () => {
        setAnchorEl(null);
    }

    const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return <>
        <AppBar position="static" color={'transparent'} style={{boxShadow: 'none'}}>
            <Toolbar>
                <Box sx={{flexGrow: 1}}>
                    <Typography variant="h6" component={'span'}>
                        {props.session?.Title ?? "-"}
                    </Typography>
                    {
                        typing ? <Typography variant="caption" color={'grey'} ml={2}>
                            输入中...
                        </Typography> : <></>
                    }
                </Box>
                <IconButton edge={'end'} size="large"
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleMenu}
                            color="inherit">
                    <MoreVertRounded/>
                </IconButton>

                <Menu
                    id="menu-appbar"
                    anchorEl={anchorEl}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    open={Boolean(anchorEl)}
                    onClose={handleClose}
                >
                    <MenuItem disabled>
                        <DescriptionOutlined/><Box m={1}>频道详细信息</Box>
                    </MenuItem>
                    <MenuItem onClick={handleCleanMessage}>
                        <DeleteOutlined/><Box m={1}>清理消息</Box>
                    </MenuItem>
                    <MenuItem disabled onClick={handleMute}>
                        <NotificationsOffOutlined/><Box m={1}>关闭通知</Box>
                    </MenuItem>
                    <MenuItem disabled onClick={handleExit}>
                        <ExitToAppOutlined/><Box m={1}>退出频道</Box>
                    </MenuItem>
                </Menu>
            </Toolbar>
        </AppBar>
    </>
}

export function ChatRoomContainer() {

    const {sid} = useParams<{ sid: string }>();
    const [session, setSession] = React.useState(null);

    useEffect(() => {
        setSession(Account.session().get(sid))
    }, [sid])

    useEffect(() => {
        if (session === null) {
            const sp = Account.session().event().pipe(
                filter((e) => e.event === SessionListEventType.create && e.session.ID === sid),
                map((e) => e.session)
            ).subscribe((e) => setSession(e))
            return () => sp.unsubscribe()
        }
    }, [session, sid])

    if (session === null) {
        return <Box mt={"0%"} bgcolor={grey[50]}
                    className={'xl:h-[95vh] lg:h-[100vh] flex flex-col rounded-br-md rounded-tr-md'}>
            <Typography variant="h6" textAlign={"center"} mt={'40%'}>
                选择一个会话开始聊天
            </Typography>
        </Box>
    }

    const sendMessage = (msg: string, type: number) => {
        if (session != null) {
            session.send(msg, type).subscribe({error: (err) => showSnack(err.toString())})
        }
    }

    return (
        <Box className={'xl:h-[95vh] lg:h-[100vh] flex flex-col rounded-br-md rounded-tr-md'} style={{
            backgroundImage: `url(/chat_bg.jpg)`,
            backgroundRepeat: 'repeat',
        }}>
            {/*<Box className={'h-14 pl-6 rounded-tr-md'} color={'black'} bgcolor={"white"}>*/}
            {/*    <Typography variant={"h6"} style={{lineHeight: "60px"}}>*/}
            {/*        {session.Title}*/}
            {/*    </Typography>*/}
            {/*</Box>*/}

            <Box className={'rounded-tr-md'} color={'black'} bgcolor={"white"}>
                <SessionTitleBar session={session}/>
            </Box>

            <Divider/>
            <Box className={'w-full flex-auto'}>
                <div className={'flex flex-col h-full'}>
                    <Box>
                        <SessionMessageList/>
                    </Box>

                    <Box className={'h-16 px-5'}>
                        <MessageInputV2 session={sid} onSend={sendMessage}/>
                    </Box>
                </div>

            </Box>
        </Box>)
}

export const ChatRoomContainerMobile = withRouter((props: RouteComponentProps) => {

    const {sid} = useParams<{ sid: string }>();
    const session = Account.getInstance().getSessionList().get(sid);

    if (session === null) {
        props.history.replace("/im/session")
        return <Loading/>
    }

    const sendMessage = (msg: string, type: number) => {
        if (session != null) {
            session.send(msg, type).subscribe({error: (err) => showSnack(err.toString())})
        }
    }

    return (<Box height={"100vh"}>
        <AppBar position="static">
            <Toolbar>
                <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => {
                    session.clearUnread()
                    props.history.replace("/im/session")
                }}>
                    <ArrowBack/>
                </IconButton>
                <Typography variant="h6">
                    {session?.Title ?? "-"}
                </Typography>
            </Toolbar>
        </AppBar>

        <Box height={"calc(100vh - 138px)"} style={{
            backgroundImage: `url(/chat_bg.jpg)`,
            backgroundRepeat: 'repeat',
        }} width={'100%'}>
            {/*<Box height={"10%"}>*/}
            {/*    {isGroup && (<Box><GroupMemberList id={session.To}/><Divider/></Box>)}*/}
            {/*</Box>*/}

            <div className={'flex flex-col h-full'}>
                <Box height={"calc(95vh - 60px)"}
                     className={'BeautyScrollBar overflow-y-auto flex w-full'}>
                    <SessionMessageList/>
                </Box>
            </div>
        </Box>
        <Box height={'80px'} bgcolor={"white"}>
            <MessageInput onSend={sendMessage}/>
        </Box>
    </Box>)
})