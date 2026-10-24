# Library App

Aplicación móvil de la **Guía 2: app de biblioteca**. Es un proyecto
independiente de Expo/React Native que consume la API del proyecto
`library_api`.

Incluye:

- Inicio de sesión y registro.
- Catálogo de libros con búsqueda y detalle.
- Caché local con SQLite.
- Cola de solicitudes para trabajar temporalmente sin conexión.
- Sincronización con el servidor y resolución de conflictos a favor del
  servidor.
- Sesiones y tokens protegidos con SecureStore.
- Solicitud y seguimiento de préstamos.
- Cambio de portadas desde la cámara o la galería para bibliotecarios.

La aplicación nunca se conecta directamente a Firebase: todas las peticiones
van a `library_api`.

## Requisitos

- Node.js 20 o superior.
- npm.
- Expo Go para probar las funciones compatibles con Expo Go, o un development
  build para módulos nativos que no estén incluidos en Expo Go.
- `library_api` ejecutándose y accesible desde el dispositivo.

## Instalación

```bash
npm install
```

Copia `.env.example` como `.env` y configura la URL de la API:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
```

Usa la dirección según el entorno:

- Teléfono físico: IP local del computador en la misma red Wi-Fi.
- Emulador Android: `http://10.0.2.2:3000`.
- Simulador iOS: `http://localhost:3000`.

En un teléfono físico, inicia la API con `pnpm dev:lan` dentro de
`library_api` para aceptar conexiones de la red local. Las variables
`EXPO_PUBLIC_*` quedan incluidas en la aplicación; nunca pongas secretos allí.

## Comandos

```bash
npm start          # inicia Expo
npm run android    # abre el proyecto en Android
npm run ios        # abre el proyecto en iOS
npm run web        # inicia la versión web
npm test           # ejecuta las pruebas
npm run typecheck  # verifica TypeScript
npm run lint       # ejecuta ESLint
```

También puedes iniciar Expo con:

```bash
npx expo start
```

## Orden recomendado

1. Inicia `library_api` y verifica `GET /api/health`.
2. Configura `EXPO_PUBLIC_API_URL` en `.env`.
3. Instala las dependencias de esta aplicación.
4. Ejecuta `npm start`.
5. Abre la aplicación con Expo Go, un emulador o un development build.

## Estructura

- `src/app/`: rutas y pantallas de Expo Router.
- `src/components/`: componentes reutilizables.
- `src/config/`: configuración por ambiente.
- `src/db/`: SQLite, migraciones y repositorios locales.
- `src/services/api/`: cliente HTTP y comunicación con la API.
- `src/services/auth/`: administración de sesión y tokens.
- `src/providers/`: estado y sincronización de datos.
- `tests/`: pruebas unitarias e integración con la API.

## Verificación

Antes de publicar cambios, ejecuta:

```bash
npm run typecheck
npm run lint
npm test
```

El archivo `.env` es local y está excluido de Git. Solo `.env.example`, que no
contiene credenciales, debe compartirse con el repositorio.
