# LashMaker MVP

MVP веб-приложения для мастера по наращиванию ресниц на `Next.js App Router`, `TypeScript` и `Supabase`.

## Что умеет MVP

### Для клиента

- Главная страница с описанием услуги и формой записи
- Выбор только из свободных слотов
- Создание публичной ссылки вида `/booking/[token]`
- Просмотр деталей записи
- Отмена записи клиентом
- После отмены слот снова становится доступным
- Регистрация и вход клиента по телефону и паролю
- Личный кабинет клиента `/account` с просмотром только своих записей

### Для мастера

- Страница `/admin` с расписанием по дням
- Видно свободные и занятые окна
- Видно имя, телефон и стиль клиента
- Можно добавлять окна для записи
- Можно удалять свободные окна
- Видно отмененные записи
- Вход мастера `/master/login`
- Кабинет мастера `/master/dashboard`
- Seed мастера через env без хардкода в коде

### Интеграции

- Абстракция под SMS-провайдера
- Отправка SMS-подтверждения после бронирования
- Серверный маршрут для напоминаний перед записью
- Защита от повторной отправки через `reminder_sent`

## Стек

- `Next.js` App Router
- `TypeScript`
- `Supabase`
- `Zod`
- Подготовка к деплою на `Vercel`

## Быстрый запуск

1. Установите зависимости:

```bash
npm install
```

2. Скопируйте окружение:

```bash
cp .env.example .env.local
```

3. Заполните переменные:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

4. Примените SQL из файла [20260403210000_init.sql](/Users/esfirpr/Documents/Project/lashmaker/supabase/migrations/20260403210000_init.sql) в Supabase SQL Editor или через Supabase CLI.

5. Запустите проект:

```bash
npm run dev
```

6. Откройте [http://localhost:3000](http://localhost:3000)

## Настройка Supabase

Используется две таблицы:

- `time_slots`
- `bookings`
- `users`

Приложение работает через серверные функции и API routes, поэтому доступ к Supabase идет только на сервере через `SUPABASE_SERVICE_ROLE_KEY`. На клиенте сервисный ключ не используется.

Авторизация и роли уже добавлены:

- `client` входит по телефону и паролю
- `master` входит по nickname и паролю
- сессия хранится в httpOnly cookie
- middleware защищает `/account`, `/admin`, `/master/dashboard`

## Как работают SMS

Сейчас можно использовать `console`-провайдер или `ProntoSMS`:

- подтверждение записи просто логируется в серверную консоль
- напоминание перед записью тоже логируется

Для `ProntoSMS` заполните:

- `SMS_USER`
- `SMS_PASSWORD`
- `SMS_SENDER`

И переключите `SMS_PROVIDER=prontosms`.

Провайдер отправляет SMS через GET API:

```text
https://clk.prontosms.ru/sendsms.php
```

С параметрами:

- `user`
- `pwd`
- `sadr`
- `dadr`
- `text`

В проекте это реализовано в [lib/sms/prontosms.ts](/Users/esfirpr/Documents/Project/lashmaker/lib/sms/prontosms.ts).

## Напоминания

Маршрут:

- `GET /api/reminders`

Заголовок:

- `authorization: Bearer <CRON_SECRET>`

Поведение:

- ищет подтвержденные записи примерно за 5 минут до начала с небольшим буфером
- отправляет SMS
- помечает `reminder_sent = true`
- повторно такие записи не шлет

Пример вызова:

```bash
curl http://localhost:3000/api/reminders \
  -H "authorization: Bearer change-me"
```

## Master seed

Мастер-аккаунт не захардкожен в коде. Он создается серверной инициализацией `createMasterIfNotExists()` на основе env:

- `MASTER_NICKNAME`
- `MASTER_PASSWORD`

Пароль хранится только в виде `scrypt` hash.

## Деплой на Vercel

1. Создайте проект в Vercel и подключите репозиторий.
2. Добавьте переменные окружения из `.env.example`, включая:
   - `AUTH_SECRET`
   - `MASTER_NICKNAME`
   - `MASTER_PASSWORD`
3. В Supabase выполните миграцию.
4. Установите `NEXT_PUBLIC_APP_URL` на production-домен Vercel.
5. Vercel Cron уже описан в [vercel.json](/Users/esfirpr/Documents/Project/lashmaker/vercel.json) и вызывает `GET /api/reminders` каждую минуту, чтобы не пропускать окно напоминания за 5 минут.

## Структура проекта

```text
app/
  admin/
  api/
  account/
  booking/[token]/
  login/
  master/
  register/
components/
lib/
  auth/
  sms/
  supabase/
supabase/migrations/
```

## Архитектура

- `app/` содержит страницы, серверные actions и API routes
- `components/` содержит UI-компоненты форм
- `lib/booking-service.ts` хранит основную бизнес-логику бронирований и слотов
- `lib/auth/` хранит пароли, сессии и seed мастера
- `lib/supabase/admin.ts` создает серверный Supabase-клиент
- `lib/sms/` содержит абстракцию под SMS-провайдера
- `supabase/migrations/` содержит SQL для схемы БД
