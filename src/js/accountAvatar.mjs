function profileImage(value) {
  if (typeof value !== "string") return null;
  if (
    /^data:image\/(?:jpeg|png|webp);base64,\s*[A-Za-z0-9+/]+={0,2}$/.test(value)
  )
    return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function accountAvatar(user) {
  const avatar = document.createElement("span");
  avatar.className = "workspace-user-avatar";
  avatar.setAttribute("aria-hidden", "true");
  const initial = user?.name?.trim().charAt(0).toUpperCase() || "?";
  avatar.textContent = initial;
  const source = profileImage(user?.image);
  if (!source) return avatar;
  const image = document.createElement("img");
  image.alt = "";
  image.width = 30;
  image.height = 30;
  image.referrerPolicy = "no-referrer";
  image.hidden = true;
  image.addEventListener("load", () => {
    image.hidden = false;
    avatar.replaceChildren(image);
  });
  image.addEventListener("error", () => {
    avatar.textContent = initial;
  });
  image.src = source;
  avatar.append(image);
  return avatar;
}
