# PRE RUN

> This use tesa topgun 19 server for backend to store data.

> If you want to make this project alive again, you have to create server follow document i uploaded or just put this all code to generative ai for create backend for you.

*.env

```
VITE_TESA_API_BASE="API_DOMAIN_NAME"
VITE_TESA_SOCKET_URL="BACKEND_DOMAIN_NAME"
VITE_MAPBOX_TOKEN="MAP_BOX_TOKEN"
```

Example

```
VITE_TESA_API_BASE="https://tesa-api.crma.dev/api"
VITE_TESA_SOCKET_URL="https://tesa-api.crma.dev"
VITE_MAPBOX_TOKEN="pk.eyJ1IjoiY2hhdGNoYWxlcm0iLCJhIjoiY21nZnpiYzU3MGRzdTJrczlkd3RxamN4YyJ9.k288gnCNLdLgczawiB79gQ"
```

NOTICE : MAPBOX TOKEN will be expired or unavailable


# HOW TO RUN

drone_dashboard folder

``` bash
cd drone_dasboard

# set up .env
npm install
npm run dev
```
mock_simulation folder

``` bash

cd mock_simulation

# run simulator
python3 defence_client.py
python3 offence_client.py

```

# PREVIEW

login

![login img](https://github.com/[username]/[reponame]/blob/[branch]/image.jpg?raw=true)
