import {Box, Grid} from "@mui/material";
import React, {useEffect, useState} from 'react';
import {BrowserRouter as Router, Redirect, Route, Switch} from "react-router-dom";
import {Api} from "./api/api";
import './App.css';
import {Register} from "./component/auth/Register";
import {AppMainPanel} from "./component/AppMainPanel";
import {showSnack, SnackBar} from "./component/widget/SnackBar";
import {Account} from "./im/account";
import {getCookie} from "./utils/Cookies";
import {Guest} from "./component/auth/Guest";
import {Loading} from "./component/widget/Loading";
import {Subscription} from "rxjs";
import {Auth} from "./component/auth/Auth";
import {IMWsClient} from "./im/im_ws_client";

function App() {

    const authed = Account.getInstance().isAuthenticated()
    const [state, setState] = useState({
        isAuthenticated: authed,
        isLoading: authed,
    })

    useEffect(() => {
        const base = getCookie("baseUrl")
        const ws = getCookie('wsUrl')
        if (base) {
            Api.setBaseUrl(base)
        }
        if (ws) {
            Account.getInstance().server = ws
        }

        return () => {
            IMWsClient.close()
        }
    }, [])

    useEffect(() => {

        let subscription: Subscription | null = null
        if (authed) {
            subscription = Account.getInstance().auth()
                .subscribe({
                    error: (e) => {
                        setState({
                            isAuthenticated: false,
                            isLoading: false,
                        })
                        showSnack(e.message)
                    },
                    complete: () => {
                        setState({
                            isAuthenticated: true,
                            isLoading: false,
                        })
                    }
                });
        }
        return () => subscription?.unsubscribe()
    }, [authed])


    return (
        <div className="App">
            <SnackBar/>
            <Box sx={{width: '100%', position: 'relative'}}>
                <Box sx={{
                    position: 'absolute',
                    backgroundImage: "url('/app_bg.jpg')",
                    zIndex: -1,
                    width: '100%',
                    height: '100vh',
                    filter: 'saturate(0.6)',
                }}/>
                <Router>
                    <Grid container style={{height: "100vh"}} alignItems={"center"}>
                        {state.isLoading ? <Loading/> :
                            <Switch>
                                <Route path={"/auth/signin"} exact={true}>
                                    <Auth/>
                                </Route>
                                <Route path={"/auth/guest"} exact={true}>
                                    <Guest/>
                                </Route>
                                <Route path={"/auth/signup"} exact={true}>
                                    <Register/>
                                </Route>
                                <Route path={"/auth"} exact={true}>
                                    <Redirect to={'/auth/signin'}/>
                                </Route>
                                <Route path={"/im"}>
                                    <AppMainPanel/>
                                </Route>
                                <Route path={"/"} strict={true}>
                                    {state.isAuthenticated ? <Redirect to={'/im'}/> : <Redirect to={'/auth'}/>}
                                </Route>
                            </Switch>
                        }
                    </Grid>
                </Router>
            </Box>
        </div>
    );
}

export default App;
