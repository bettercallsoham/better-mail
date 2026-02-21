"use client";

import { useCurrentUser } from "@/lib/query/user";
import Image from "next/image";

const AppPage = () => {
  const { data, isLoading, error } = useCurrentUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error || !data?.success) {
    return <div>Session expired</div>;
  }

  const user = data.user;

  return (
    <div>
      <h1>Welcome, {user.fullName}</h1>
      <p>Email: {user.email}</p>
      <Image
        height={300}
        width={300}
        src={user.avatar}
        alt={user.fullName}
        className="w-12 h-12 rounded-full mt-4"
      />
    </div>
  );
};

export default AppPage;
