<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google_drive' => [
        // OAuth 2.0 client for per-card Shared Drive creation - a real Google
        // account must authorize this (Shared Drive creation/membership
        // can't be done by an external service account). Create this as an
        // "OAuth client ID" (Web application) in a Google Cloud project.
        'oauth_client_id' => env('GOOGLE_OAUTH_CLIENT_ID'),
        'oauth_client_secret' => env('GOOGLE_OAUTH_CLIENT_SECRET'),
        'oauth_redirect_uri' => env('GOOGLE_OAUTH_REDIRECT_URI'),

        // Superadmin/admin accounts that exist only for app/infra
        // administration (e.g. the account used to set up the Google Cloud
        // project) and should NOT be auto-added as a member of every card's
        // Shared Drive, unlike every other superadmin/admin.
        'excluded_admin_emails' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('GOOGLE_DRIVE_EXCLUDED_ADMIN_EMAILS', ''))
        ))),
    ],

];
