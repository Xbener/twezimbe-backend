import { DefaultEventsMap, Server } from "socket.io";
import { UserDoc } from "../model/user.model";


const onlineUsers = new Map<string, UserDoc>()
export default async (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
    io.on('connection', (socket) => {
        console.log(`${socket.id} connected`)

        socket.on('add-online-user', user => {
            onlineUsers.set(socket.id, user)
            console.log('Online users:', onlineUsers.size)
        })

        socket.on('disconnect', ()=>{
            onlineUsers.delete(socket.id)
            console.log('Online users:', onlineUsers.size)
        })
    })

}