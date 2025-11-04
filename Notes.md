Comandos para ejecutar todo correctamente.

Una vez clonado el repositorio accceder a la terminal, entrar a la ruta hasta miRepo.

En la terminal ejectar lo siguientes comandos:

docker-compose up -d backend db --> crea los contenedores docker mediante el archivo docker-compose.yml de la bd y el backend(server).
docker compose up -d cordova --> crea los contenedores docker mediante el archivo docker-compose.yml para el apache cordova.

docker exec -it mirepo-cordova-1 bash  --> te permite acceder a la bash del contenedor de cordova para poder ejecutar la app android.

    Dentro de la bash de cordova:
    npm install -g http-server --> para poder crear servidores http
    http-server ./www -p 8000  --> crea el servidor http que escucha en el puerto 8000, el mismo que hemos definido pora el cordova en el docker-compose.yml


para reiniciar docker/ejecutarlo todo a la vez (unico comando necesario para levantar toda la app):

    docker compose up --build

para correr la app en un dispositivo via usb:
    buscar el nombre del dispositivo con --> adb devices
    luego ejecutar con --> cordova run android -device(nombre del dispositivo)

Para usar cordova:
cordova platform add android
cordova build android
cordova run android


Para entrar en la bd de docker:

docker ps
docker exec -it (postgressIdContainer) bash
psql -U miusuario -d micliente


Mirar los logs en un dispositivo real:

chrome://inspect

Generador de QRs:
QR.io

Plugins necesarios para el funcinamiento correcto en cordova (añadirlos en la ruta de cordova-app):

cordova plugin add cordova-plugin-android-permissions@1.1.0
cordova plugin add cordova-plugin-camera@7.0.0
cordova plugin add cordova.plugins.diagnostic@7.2.3