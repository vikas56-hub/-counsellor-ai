"use client"
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getOrCreateGuestId } from '@/lib/auth/guest';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
    const router = useRouter();

    const handleGuest = () => {
        getOrCreateGuestId();
        router.push('/chat');
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32 }}>Sign in to CounslerAI</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 280 }}>
                <Button onClick={() => signIn('google')}>Sign in with Google</Button>
                <Button onClick={() => signIn('github')}>Sign in with GitHub</Button>
                <Button onClick={() => signIn('email')}>Sign in with Email</Button>
                <Button variant="outline" onClick={handleGuest}>Continue as Guest</Button>
                <Button variant="ghost" onClick={handleGuest}>Skip for now</Button>
            </div>
            <div style={{ marginTop: 16, color: '#888', fontSize: 14 }}>
                You can use CounslerAI as a guest, but your sessions will not be saved to an account.
            </div>
        </div>
    );
}
