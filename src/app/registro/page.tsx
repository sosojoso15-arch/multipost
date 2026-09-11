import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function RegistroPage() {
  return (
    <Suspense>
      <AuthForm mode="registro" />
    </Suspense>
  );
}
