# MAX Client · GREEN-API

Нужны Node.js 22.12+ и npm.

## Локальный запуск

```bash
git clone https://github.com/luhgeek1/greenapi-testtask.git
cd greenapi-testtask
npm ci
npm run dev
```

Откройте адрес из терминала, обычно `http://127.0.0.1:5173`.
В окне подключения введите idInstance, apiTokenInstance и apiUrl, затем нажмите «Подключиться». Для запуска демо нажмите «Открыть демо» под полем apiUrl и «Подключиться».

## Запуск готовой сборки

```bash
npm run build
npm run preview
```

Откройте адрес из терминала, обычно `http://127.0.0.1:4173`.

Сборка сохраняется в `docs`. Для GitHub Pages выберите ветку `deploy` и папку `/docs`. После push в `main` GitHub Actions проверяет проект, собирает его и обновляет `deploy` автоматически.
