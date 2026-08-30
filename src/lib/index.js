import { cookies } from "next/headers";

export const userInfo = async () => {
  const cookieStore = await cookies();
  // cookies().get("user") returns { name, value } | undefined
  const userCookie = cookieStore.get("user");

  if (!userCookie?.value) return {}; // safe check

  let parsed;
  try {
    parsed = JSON.parse(userCookie.value);
  } catch (e) {
    return {}; // invalid cookie data
  }

  const { shops, id } = parsed;
  if (!shops) return {};

  return {
    shopId: shops?._id || null,
    userId: id || null,
  };
};

export const getUserInfo = async () => {
  const cookieStore = await cookies();
  // cookies().get("user") returns { name, value } | undefined
  const userCookie = cookieStore.get("user");

  if (!userCookie?.value) return {}; // safe check

  let parsed;
  try {
    parsed = JSON.parse(userCookie.value);
  } catch (e) {
    return {}; // invalid cookie data
  }

  return parsed;
};
