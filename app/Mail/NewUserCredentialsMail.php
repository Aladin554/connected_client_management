<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Queue\SerializesModels;

class NewUserCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $password;
    public $resetUrl;

    public function __construct($user, $password, $resetUrl)
    {
        $this->user = $user;
        $this->password = $password;
        $this->resetUrl = $resetUrl;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your New Account Credentials'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.new_user_credentials'
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
