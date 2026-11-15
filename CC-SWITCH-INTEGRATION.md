# CC Switch integrado al repositorio

El proyecto original de CC Switch se añadió como **submódulo** en `cc-switch/`, fijado al commit upstream `27e2cffa91c091469d8106e679cae2772d47c8dd`. El repositorio de origen y todos sus archivos permanecen intactos; este repositorio solo guarda el puntero de versión y la configuración estándar de Git submodules.

- Origen: https://github.com/farion1231/cc-switch
- Licencia declarada por el proyecto: MIT; se conserva en el submódulo.
- Para obtener el código completo al clonar: `git clone --recurse-submodules https://github.com/isaacmtz123490po-arch/Metatron-.git`
- Si ya se clonó: `git submodule update --init --recursive`

## Compatibilidad y publicación

CC Switch es una aplicación de escritorio hecha con Tauri 2, Rust y React/TypeScript. No es una biblioteca web ni un endpoint de IA, y no puede ejecutarse sin cambios dentro de la página estática/Vercel de Metatron AI. La integración conserva la fuente original en una carpeta propia y no sustituye el chat, su endpoint, ni los archivos existentes. Las compilaciones de escritorio requieren las dependencias y pasos oficiales de CC Switch para cada sistema operativo.
