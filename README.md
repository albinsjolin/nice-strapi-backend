# Start command
kör från home, skriv cd för att komma till home
kör sedan: 
sudo docker run -it -d -p 1337:1337 -v `pwd`/nice-strapi-backend:/srv/app strapi/strapi