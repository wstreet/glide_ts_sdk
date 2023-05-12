import {from, groupBy, map, mergeMap, Observable, of, toArray} from "rxjs";
import {Api} from "../api/api";
import {GlideChannelInfo, GlideUserInfo} from "./def";
import {onErrorResumeNext} from "rxjs/operators";
import {UserInfoBean} from "../api/model";
import {onNext} from "../rx/next";
import {getCookie, setCookie} from "../utils/Cookies";
import {SessionListCache} from "./session_list";
import {ChatMessageCache, MessageBaseInfo} from "./chat_message";
import {SessionBaseInfo} from "./session";
import {MessageStatus} from "./message";
import {ChatMessageDbCache, GlideDb, SessionDbCache} from "./db";

export class GlideCache implements SessionListCache, ChatMessageCache {

    private _db: GlideDb = new GlideDb();

    private _sessionDbCache: SessionListCache
    private _messageDbCache: ChatMessageCache

    init(uid: string): Observable<GlideCache> {
        this._sessionDbCache = new SessionDbCache(this._db)
        this._messageDbCache = new ChatMessageDbCache(this._db)

        return this._db.init(uid)
            .pipe(
                map(() => {
                    console.log('cache init')
                    return this
                }),
            )
    }

    addMessage(message: MessageBaseInfo): Observable<void> {
        return this._messageDbCache.addMessage(message)
    }

    addMessages(messages: MessageBaseInfo[]): Observable<void> {
        return this._messageDbCache.addMessages(messages)
    }

    clearAllSession(): Observable<void> {
        return this._sessionDbCache.clearAllSession()
    }

    containSession(sid: string): Observable<boolean> {
        return this._sessionDbCache.containSession(sid)
    }

    deleteMessage(cliId: string): Observable<void> {
        return this._messageDbCache.deleteMessage(cliId)
    }

    deleteMessageBySid(sid: string): Observable<void> {
        return this._messageDbCache.deleteMessageBySid(sid)
    }

    getSession(sid: string): Observable<SessionBaseInfo | null> {
        return this._sessionDbCache.getSession(sid)
    }

    getAllSession(): Observable<SessionBaseInfo[]> {
        return this._sessionDbCache.getAllSession()
    }

    getMessageByCliId(cliId: string): Observable<MessageBaseInfo | null> {
        return this._messageDbCache.getMessageByCliId(cliId)
    }

    getMessageByMid(mid: number): Observable<MessageBaseInfo | null> {
        return this._messageDbCache.getMessageByMid(mid)
    }

    getLatestSessionMessage(sid: string): Observable<MessageBaseInfo | null> {
        return this._messageDbCache.getLatestSessionMessage(sid)
    }

    getSessionMessageBySeq(sid: string, beforeSeq: number): Observable<MessageBaseInfo | null> {
        return this._messageDbCache.getSessionMessageBySeq(sid, beforeSeq)
    }

    getSessionMessagesByTime(sid: string, beforeTime: number): Observable<MessageBaseInfo[]> {
        return this._messageDbCache.getSessionMessagesByTime(sid, beforeTime)
    }

    removeSession(sid: string): Observable<void> {
        return this._sessionDbCache.removeSession(sid)
    }

    setSession(sid: string, info: SessionBaseInfo): Observable<void> {
        return this._sessionDbCache.setSession(sid, info)
    }

    sessionCount(): Observable<number> {
        return this._sessionDbCache.sessionCount()
    }

    updateMessage(message: MessageBaseInfo): Observable<void> {
        return this._messageDbCache.updateMessage(message)
    }

    updateMessageStatus(cliId: number, status: MessageStatus): Observable<void> {
        return this._messageDbCache.updateMessageStatus(cliId, status)
    }

}

class cache {

    private tempUserInfo = new Map<string, GlideUserInfo>();

    constructor() {
        this.tempUserInfo.set('system', {
            avatar: "https://im.dengzii.com/system.png",
            name: "系统",
            uid: "system",
        })
    }

    public getToken(): string {
        return getCookie("token");
    }

    public storeToken(token: string) {
        setCookie("token", token, 1);
    }

    public getUserInfo(id: string): GlideUserInfo | null {
        let i = this.tempUserInfo.get(id);
        if (i !== null && i !== undefined) {
            return i
        }
        const res = this._readObject(`ui_${id}`);
        if (res !== null) {
            this.tempUserInfo.set(id, res);
            console.log('[cache]', "restore cache user info", res)
            return res
        }
        return null
    }

    public cacheUserInfo(id: string): Promise<any> {
        const execute = (resolved, reject) => {
            if (this.tempUserInfo.has(id)) {
                resolved()
                return
            }
            this.loadUserInfo(id).subscribe(r => {
                console.log('cache user info', this.tempUserInfo.get(id))
                resolved()
            }, r => {
                resolved()
            })
        }
        return new Promise<any>(execute)
    }

    public getChannelInfo(id: string): GlideChannelInfo | null {
        if (id === 'the_world_channel') {
            return {avatar: "https://im.dengzii.com/world_channel.png", id: id, name: "世界频道",}
        }
        return {avatar: "", id: id, name: id}
    }

    public loadUserInfo1(id: string): Observable<GlideUserInfo> {
        const cache = this.getUserInfo(id);
        if (cache !== null) {
            return of(cache)
        }

        return from(Api.getUserInfo(id)).pipe(
            map<UserInfoBean[], GlideUserInfo>((us, i) => {
                const u = us[0];
                const m: GlideUserInfo = {
                    avatar: u.avatar,
                    name: u.nick_name,
                    uid: u.uid.toString(),
                }
                this._writeObject(`ui_${id}`, m);
                this.tempUserInfo.set(m.uid, m);
                return m;
            }),
            onErrorResumeNext(of({
                avatar: "-",
                name: `${id}`,
                uid: `${id}`,
            })),);

    }

    public loadUserInfo(...id: string[]): Observable<GlideUserInfo[]> {

        return of(...id).pipe(
            groupBy<string, boolean>(id => {
                return this.getUserInfo(id) != null;
            }),
            mergeMap(g => {
                if (g.key) {
                    return g.pipe(
                        map(id => this.getUserInfo(id)),
                    );
                } else {
                    return g.pipe(
                        toArray(),
                        mergeMap(ids => {
                            return Api.getUserInfo(...ids)
                        }),
                        mergeMap(userInfos => of(...userInfos)),
                        map<UserInfoBean, GlideUserInfo>(u => ({
                            avatar: u.avatar,
                            name: u.nick_name,
                            uid: u.uid.toString()
                        })),
                    )
                }
            }),
            toArray(),
            onNext(userInfo => {
                userInfo.forEach(u => {
                    this._writeObject(`ui_${id}`, u);
                    this.tempUserInfo.set(u.uid, u);
                });
            })
        )
    }

    public clean() {
        // this.tempUserInfo.clear();
        // TODO fix
        localStorage.clear();
    }

    private _readObject(key: string): any | null {
        const val = localStorage.getItem(key);
        if (val === null) {
            return null;
        }
        console.log('[cache]', "read cache", key, val)
        return JSON.parse(val);
    }

    private _writeObject(key: string, val: any): void {
        console.log('[cache]', "write cache", key, val)
        localStorage.setItem(key, JSON.stringify(val));
    }
}

export const Cache = new cache();
