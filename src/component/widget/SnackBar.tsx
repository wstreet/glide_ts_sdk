import {useEffect} from "react";
import {closeSnackbar, enqueueSnackbar, SnackbarProvider} from 'notistack';
import {IconButton} from "@mui/material";
import {CloseRounded} from "@mui/icons-material";
import {Logger} from "../../utils/Logger";

let snack = (s: string) => {
    console.log("show snack:", s);
}

export function showSnack(msg: string) {
    if (!msg) {
        Logger.error("SnackBar", "showSnack msg is null")
        return
    }
    const m = msg.length > 30 ? msg.substring(0, 30) + "..." : msg;
    snack(m);
}

export function SnackBar() {

    useEffect(() => {
        snack = (s: string) => {
            const action = snackbarId => (
                <IconButton onClick={() => {
                    closeSnackbar(snackbarId)
                }}>
                    <CloseRounded/>
                </IconButton>
            );
            enqueueSnackbar(s, {variant: "info", autoHideDuration: 3000, action: action})
        }
        return () => {
            snack = (s: string) => {
                console.log("show snack:", s);
            }
        }
    }, [])

    return <SnackbarProvider maxSnack={3}
                             anchorOrigin={{vertical: "top", horizontal: "center"}}><span/></SnackbarProvider>

}
