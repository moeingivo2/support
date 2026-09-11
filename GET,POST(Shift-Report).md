# POST http://127.0.0.1:8000/api/shift-reports (ثبت گزارش شیفت Person I wish you told me to wait that)
```json
{
    "current_page": 1,
    "data": [
        {
            "id": 2,
            "shift_id": 1,
            "user_id": 1,
            "responded_students_count": 10,
            "unsatisfied_students_count": 1,
            "desk_requests_count": 2,
            "calls_count": 5,
            "extra_notes": null,
            "created_at": "2026-09-08T14:10:20.000000Z",
            "updated_at": "2026-09-08T14:10:20.000000Z",
            "shift": {
                "id": 1,
                "user_id": 1,
                "channel": "web",
                "start_time": "2026-09-08T12:16:05.000000Z",
                "end_time": "2026-09-08T12:18:05.000000Z",
                "status": "ended",
                "created_at": "2026-09-08T12:16:05.000000Z",
                "updated_at": "2026-09-08T12:18:05.000000Z"
            },
            "user": {
                "id": 1,
                "name": "محمدحسین میری‌پور",
                "email": "admin@example.com",
                "email_verified_at": null,
                "created_at": "2026-09-08T11:54:42.000000Z",
                "updated_at": "2026-09-08T11:54:42.000000Z",
                "role": "admin"
            }
        },
        {
            "id": 1,
            "shift_id": 2,
            "user_id": 1,
            "responded_students_count": 10,
            "unsatisfied_students_count": 1,
            "desk_requests_count": 2,
            "calls_count": 5,
            "extra_notes": null,
            "created_at": "2026-09-08T14:09:17.000000Z",
            "updated_at": "2026-09-08T14:09:17.000000Z",
            "shift": {
                "id": 2,
                "user_id": 1,
                "channel": "web",
                "start_time": "2026-09-08T12:18:35.000000Z",
                "end_time": "2026-09-08T14:08:54.000000Z",
                "status": "ended",
                "created_at": "2026-09-08T12:18:35.000000Z",
                "updated_at": "2026-09-08T14:08:54.000000Z"
            },
            "user": {
                "id": 1,
                "name": "محمدحسین میری‌پور",
                "email": "admin@example.com",
                "email_verified_at": null,
                "created_at": "2026-09-08T11:54:42.000000Z",
                "updated_at": "2026-09-08T11:54:42.000000Z",
                "role": "admin"
            }
        }
    ],
    "first_page_url": "http://127.0.0.1:8000/api/shift-reports?page=1",
    "from": 1,
    "last_page": 1,
    "last_page_url": "http://127.0.0.1:8000/api/shift-reports?page=1",
    "links": [
        {
            "url": null,
            "label": "&laquo; Previous",
            "page": null,
            "active": false
        },
        {
            "url": "http://127.0.0.1:8000/api/shift-reports?page=1",
            "label": "1",
            "page": 1,
            "active": true
        },
        {
            "url": null,
            "label": "Next &raquo;",
            "page": null,
            "active": false
        }
    ],
    "next_page_url": null,
    "path": "http://127.0.0.1:8000/api/shift-reports",
    "per_page": 20,
    "prev_page_url": null,
    "to": 2,
    "total": 2
}
```

# GET http://127.0.0.1:8000/api/shift-reports/my

```json
{
    "current_page": 1,
    "data": [
        {
            "id": 2,
            "shift_id": 1,
            "user_id": 1,
            "responded_students_count": 10,
            "unsatisfied_students_count": 1,
            "desk_requests_count": 2,
            "calls_count": 5,
            "extra_notes": null,
            "created_at": "2026-09-08T14:10:20.000000Z",
            "updated_at": "2026-09-08T14:10:20.000000Z",
            "shift": {
                "id": 1,
                "user_id": 1,
                "channel": "web",
                "start_time": "2026-09-08T12:16:05.000000Z",
                "end_time": "2026-09-08T12:18:05.000000Z",
                "status": "ended",
                "created_at": "2026-09-08T12:16:05.000000Z",
                "updated_at": "2026-09-08T12:18:05.000000Z"
            }
        },
        {
            "id": 1,
            "shift_id": 2,
            "user_id": 1,
            "responded_students_count": 10,
            "unsatisfied_students_count": 1,
            "desk_requests_count": 2,
            "calls_count": 5,
            "extra_notes": null,
            "created_at": "2026-09-08T14:09:17.000000Z",
            "updated_at": "2026-09-08T14:09:17.000000Z",
            "shift": {
                "id": 2,
                "user_id": 1,
                "channel": "web",
                "start_time": "2026-09-08T12:18:35.000000Z",
                "end_time": "2026-09-08T14:08:54.000000Z",
                "status": "ended",
                "created_at": "2026-09-08T12:18:35.000000Z",
                "updated_at": "2026-09-08T14:08:54.000000Z"
            }
        }
    ],
    "first_page_url": "http://127.0.0.1:8000/api/shift-reports/my?page=1",
    "from": 1,
    "last_page": 1,
    "last_page_url": "http://127.0.0.1:8000/api/shift-reports/my?page=1",
    "links": [
        {
            "url": null,
            "label": "&laquo; Previous",
            "page": null,
            "active": false
        },
        {
            "url": "http://127.0.0.1:8000/api/shift-reports/my?page=1",
            "label": "1",
            "page": 1,
            "active": true
        },
        {
            "url": null,
            "label": "Next &raquo;",
            "page": null,
            "active": false
        }
    ],
    "next_page_url": null,
    "path": "http://127.0.0.1:8000/api/shift-reports/my",
    "per_page": 20,
    "prev_page_url": null,
    "to": 2,
    "total": 2
}
```

# GET http://127.0.0.1:8000/api/shift-reports (مخصوص ادمین ها)
```json
{
    "current_page": 1,
    "data": [
        {
            "id": 2,
            "shift_id": 1,
            "user_id": 1,
            "responded_students_count": 10,
            "unsatisfied_students_count": 1,
            "desk_requests_count": 2,
            "calls_count": 5,
            "extra_notes": null,
            "created_at": "2026-09-08T14:10:20.000000Z",
            "updated_at": "2026-09-08T14:10:20.000000Z",
            "shift": {
                "id": 1,
                "user_id": 1,
                "channel": "web",
                "start_time": "2026-09-08T12:16:05.000000Z",
                "end_time": "2026-09-08T12:18:05.000000Z",
                "status": "ended",
                "created_at": "2026-09-08T12:16:05.000000Z",
                "updated_at": "2026-09-08T12:18:05.000000Z"
            },
            "user": {
                "id": 1,
                "name": "محمدحسین میری‌پور",
                "email": "admin@example.com",
                "email_verified_at": null,
                "created_at": "2026-09-08T11:54:42.000000Z",
                "updated_at": "2026-09-08T11:54:42.000000Z",
                "role": "admin"
            }
        },
        {
            "id": 1,
            "shift_id": 2,
            "user_id": 1,
            "responded_students_count": 10,
            "unsatisfied_students_count": 1,
            "desk_requests_count": 2,
            "calls_count": 5,
            "extra_notes": null,
            "created_at": "2026-09-08T14:09:17.000000Z",
            "updated_at": "2026-09-08T14:09:17.000000Z",
            "shift": {
                "id": 2,
                "user_id": 1,
                "channel": "web",
                "start_time": "2026-09-08T12:18:35.000000Z",
                "end_time": "2026-09-08T14:08:54.000000Z",
                "status": "ended",
                "created_at": "2026-09-08T12:18:35.000000Z",
                "updated_at": "2026-09-08T14:08:54.000000Z"
            },
            "user": {
                "id": 1,
                "name": "محمدحسین میری‌پور",
                "email": "admin@example.com",
                "email_verified_at": null,
                "created_at": "2026-09-08T11:54:42.000000Z",
                "updated_at": "2026-09-08T11:54:42.000000Z",
                "role": "admin"
            }
        }
    ],
    "first_page_url": "http://127.0.0.1:8000/api/shift-reports?page=1",
    "from": 1,
    "last_page": 1,
    "last_page_url": "http://127.0.0.1:8000/api/shift-reports?page=1",
    "links": [
        {
            "url": null,
            "label": "&laquo; Previous",
            "page": null,
            "active": false
        },
        {
            "url": "http://127.0.0.1:8000/api/shift-reports?page=1",
            "label": "1",
            "page": 1,
            "active": true
        },
        {
            "url": null,
            "label": "Next &raquo;",
            "page": null,
            "active": false
        }
    ],
    "next_page_url": null,
    "path": "http://127.0.0.1:8000/api/shift-reports",
    "per_page": 20,
    "prev_page_url": null,
    "to": 2,
    "total": 2
}
```

# GET http://127.0.0.1:8000/api/shift-reports/pending

```json
{
    "count": 2,
    "shifts": [
        {
            "id": 4,
            "user_id": 1,
            "channel": "web",
            "start_time": "2026-09-08T14:24:56.000000Z",
            "end_time": "2026-09-08T14:25:25.000000Z",
            "status": "ended",
            "created_at": "2026-09-08T14:24:56.000000Z",
            "updated_at": "2026-09-08T14:25:25.000000Z",
            "user": {
                "id": 1,
                "name": "محمدحسین میری‌پور",
                "email": "admin@example.com",
                "email_verified_at": null,
                "created_at": "2026-09-08T11:54:42.000000Z",
                "updated_at": "2026-09-08T11:54:42.000000Z",
                "role": "admin"
            }
        },
        {
            "id": 3,
            "user_id": 1,
            "channel": "web",
            "start_time": "2026-09-08T14:16:16.000000Z",
            "end_time": "2026-09-08T14:17:20.000000Z",
            "status": "ended",
            "created_at": "2026-09-08T14:16:16.000000Z",
            "updated_at": "2026-09-08T14:17:20.000000Z",
            "user": {
                "id": 1,
                "name": "محمدحسین میری‌پور",
                "email": "admin@example.com",
                "email_verified_at": null,
                "created_at": "2026-09-08T11:54:42.000000Z",
                "updated_at": "2026-09-08T11:54:42.000000Z",
                "role": "admin"
            }
        }
    ]
}
```

