"use client"

import { FormEvent, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { useAuthStore } from "@/stores/auth-store"

export function LoginForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [username, setUsername] = useState("agent")
	const [password, setPassword] = useState("openai123")
	const login = useAuthStore((state) => state.login)
	const loading = useAuthStore((state) => state.loading)
	const error = useAuthStore((state) => state.error)

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		const success = await login(username, password)
		if (success) {
			const redirectTo = searchParams.get("from") ?? "/dashboard"
			router.replace(redirectTo)
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex w-full flex-col gap-4"
			aria-labelledby="login-title"
		>
			<div className="space-y-2">
				<Label htmlFor="username">Username</Label>
				<Input
					id="username"
					value={username}
					onChange={(event) => setUsername(event.target.value)}
					autoComplete="username"
					required
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="password">Password</Label>
				<Input
					id="password"
					type="password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					autoComplete="current-password"
					required
				/>
			</div>
			<Button type="submit" isLoading={loading} disabled={loading}>
				Sign in
			</Button>
			{error && (
				<Alert variant="error" className="text-sm">
					<span>{error}</span>
				</Alert>
			)}
			<p className="text-xs text-slate-500">
				Demo credentials: <code>agent</code> / <code>openai123</code>
			</p>
		</form>
	)
}
