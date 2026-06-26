@echo off
echo  Opening http://localhost:9000 ...
start "" http://localhost:9000
python -m http.server 9000
pause
