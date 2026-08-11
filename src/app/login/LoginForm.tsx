"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendMagicLink, type LoginState } from "./actions";
import { Paw } from "@/components/Cat";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-accent bg-accent px-5 py-3 text-on-accent transition active:translate-y-px disabled:opacity-60"
    >
      <Paw size={16} />
      {pending ? "보내는 중…" : "로그인 링크 받기"}
    </button>
  );
}

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(
    sendMagicLink,
    null
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />

      <label htmlFor="email" className="sr-only">
        이메일
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="이메일 주소"
        className="min-h-11 w-full rounded-full border-2 border-line bg-card-subtle px-5 py-3 text-ink outline-none transition placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent-soft"
      />

      <SubmitButton />

      {state ? (
        <p
          role="status"
          className={`rounded-inner px-4 py-3 text-center text-label ${
            state.ok ? "bg-tone-green-soft" : "bg-tone-orange-soft"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
