<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">

    <p>Hello {{ $user->first_name }} {{ $user->last_name }},</p>

<p>Your account has been created successfully.</p>

<p><strong>Login Email:</strong> {{ $user->email }}</p>
<p><strong>Password:</strong> {{ $password }}</p>

<p>You can now log in or reset your password anytime using the link below:</p>

<p>
    <a href="{{ $resetUrl }}" 
       style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">
       Reset Password
    </a>
</p>

<p>Thank you.</p>


</body>
</html>
