@echo off

:: 默认端口 5173，可通过第一个参数覆盖
set "PORT=5173"
if not "%~1"=="" set "PORT=%~1"

:: 切换到脚本所在目录，确保根目录正确
cd /d "%~dp0"

echo [My Spelling Game] 本地服务器启动中，端口 %PORT%

echo 尝试使用 Python 内置 http.server...
python -m http.server %PORT% --bind 127.0.0.1
if %ERRORLEVEL%==0 goto :eof

echo 未检测到 Python 或启动失败，尝试使用 npx http-server...
npx --yes http-server -p %PORT% -c-1 .
if %ERRORLEVEL%==0 goto :eof

echo 无法启动本地服务器，请确保已安装 Python 或 Node.js + npx http-server。
@pause 