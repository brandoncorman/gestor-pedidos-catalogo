# Gestor de Pedidos de Catálogo (`catalogo-pedidos-app`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Offline--First-4f46e5)](https://vite-pwa-org.netlify.app/)

Aplicación web progresiva (**PWA**) **Offline-First**, responsiva y diseñada con enfoque **Mobile-First** para reemplazar integralmente el cuaderno físico de ventas por catálogo multimarca (**Natura, Avon, Ésika, L'Bel y Cyzone**).

Opera con **costo $0**, almacena toda la información localmente en **IndexedDB (Dexie.js)** con latencia de 0 ms, ofrece respaldo y restauración en JSON, y cuenta con sincronización opcional con **Supabase (PostgreSQL)**.

---

## 🌟 Características Principales

1. **El Cuaderno Digital (Mobile-First)**:
   * Organización por campaña activa y tarjetas individuales por clienta.
   * Transcripción ultrarrápida: Cantidad, Código, Descripción, Selector táctil de Revista (*Ésika*, *L'Bel*, *Cyzone*, *Natura*, *Avon*) y **Precio Total acordado por la línea**.
   * Identificación de clientas con **descriptores de desambiguación** (ej. *Clary (Sede)*, *Clary (Trabajo)*) y perfil para **autocompras de metas mínimas**.

2. **Recepción Rápida de Caja (Modo Check-in)**:
   * Al recibir la caja de la transportista, verificación de productos con un solo toque: `Recibido OK`, `Faltó` o `Defectuoso`.
   * Los productos no recibidos o dañados se descuentan automáticamente del saldo de la clienta y se totalizan para el reclamo en la factura digital de la empresa.

3. **Cobranza Inteligente y Abonos en Cascada**:
   * Los abonos se registran a nombre de la clienta y se aplican **en cascada** cubriendo prioritariamente sus pedidos más antiguos impagos.
   * Previsualización instantánea de qué pedidos quedan saldados y remanentes a favor.

4. **Rentabilidad Silenciosa y Control Financiero**:
   * **Dinero en la Calle**: Suma en tiempo real de todas las deudas vigentes de las clientas.
   * **Ganancia Real Neta**: Cálculo automático: $\text{Ventas Válidas Entregadas} - \text{Factura Pagada a Empresa}$.

5. **100% Offline (Local-First)**:
   * Funciona sin conexión a internet en todo momento desde el navegador o la PWA instalada en Android.
   * Cola de mutaciones (`sync_queue`) para sincronización automática en segundo plano al recuperar red.

6. **Respaldos y Seguridad**:
   * Botón de descarga de respaldo completo en **formato JSON**.
   * Restauración de respaldos en 1 clic.
   * Modo Claro y Modo Oscuro con detección del sistema.

---

## 🚀 Inicio Rápido en Desarrollo

### Prerrequisitos
* Node.js v20+ o v24+
* npm v10+

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/brandoncorman/gestor-pedidos-catalogo.git
cd gestor-pedidos-catalogo

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo local
npm run dev
```

### Ejecutar Pruebas Automatizadas
```bash
npx vitest run
```

### Compilar para Producción (PWA)
```bash
npm run build
npm run preview
```

---

## ⚙️ Variables de Entorno (Opcional para Sincronización en la Nube)

Copia el archivo `.env.example` a `.env.local`:
```bash
cp .env.example .env.local
```

Configura las variables si deseas habilitar la réplica en Supabase:
* `VITE_SUPABASE_URL`: URL del proyecto Supabase.
* `VITE_SUPABASE_ANON_KEY`: Llave pública anónima de Supabase.
* `VITE_ALLOWED_EMAILS`: Lista blanca de correos autorizados separados por coma.

> **Nota**: Si estas variables se dejan en blanco, la aplicación opera de forma **100% autónoma en modo Local-First** sin intentar conexiones externas.

---

## 📱 Instalación en Android (PWA)

1. Abre la aplicación en **Google Chrome** en el celular.
2. Toca el menú de opciones (tres puntos verticales arriba a la derecha).
3. Selecciona **"Agregar a la pantalla principal"** o **"Instalar aplicación"**.
4. ¡Listo! La app aparecerá en el menú de aplicaciones como una app nativa, funcionando a pantalla completa y sin conexión a internet.

---

## 📜 Licencia

Distribuido bajo la Licencia **MIT**. Consulta el archivo [`LICENSE`](LICENSE) para más detalles.
