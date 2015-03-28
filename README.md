# Vineyard Media Controller
Server/Client application used to automate announcements and video countdown timer. In our case this is used to automate the lead up to the start of our church service reducing load on the AV team. Specifically setup to play out an announcment at 10:20 followed by a video countdown at 10:28 leading to the start of the service at 10:30.

Our setup is;
Behringer X32 desk with
* DCA6 as RPi Audio in
* DCA7 as Music in from PC
* MIX12 Output level to seperate entrance/cafe area
The main auditorium level is controlled by the main mix on the desk which is set to -5dB and therefore the overall levels in the auditorium and the cafe area can be pre-set and automated using this application.

## Install and Run
Go to the directory and run
```
npm install
npm start
```

## Client
Currently set to create a webserver on;
* localhost:8888
* Currently theres a bug with Socket.io which prevents a proper connection from being made when the webpage is loaded from the home page. Currently move to the Settings page and refresh.

## Service
To run the application as a monitored service use pm2
```
sudo npm install pm2 -g
```
generate startup script
```
pm2 startup
```
copy the grey line to the shell
```
sudo env PATH=$PATH:/usr/local/bin pm2 startup linux -u "username"
```
pm2 will now reload any running programs after it boots. To load a program using pm2
```
cd /path
pm2 start server.js
```
To show current running program and log files
```
pm2 list
pm2 logs
```
For more information see;

https://www.npmjs.com/package/pm2

##Behringer X32 OSC commands
http://www.behringer.com/assets/X32_OSC_Remote_Protocol.pdf
http://x32wiki.music-group.com/index.php?title=OSC_Remote_Protocol
http://www.academia.edu/9709659/UNOFFICIAL_X32_OSC_REMOTE_PROTOCOL
https://sites.google.com/site/patrickmaillot/x32
