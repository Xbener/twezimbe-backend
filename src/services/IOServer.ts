import { DefaultEventsMap, Server } from "socket.io";
import { UserDoc } from "../model/user.model";

let onlineUsers: UserDoc[] = []

export default async (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
    io.on('connection', (socket) => {
        console.log(`${socket.id} connected`)

        socket.on('add-online-user', user => {
            onlineUsers.push({ socketId: socket.id, ...user });
            console.log('Online users:', onlineUsers.length);
            io.emit('user-logged-in', { user, onlineUsers });
        });

        socket.on('disconnect', () => {
            const user = onlineUsers.find(u => u.socketId === socket.id);
            if (user) {
                onlineUsers = onlineUsers.filter(u => u.socketId !== socket.id);
                console.log('Online users:', onlineUsers.length);
                io.emit('user-logged-out', { user, onlineUsers });
            }
        });
    })

}