import { router, type Href } from "expo-router";

// expo-router doesn't handle React Navigation's navigation.reset(), so clear
// the stack and swap in the target screen instead
export const resetTo = (href: Href) => {
  if (router.canDismiss()) router.dismissAll();
  router.replace(href);
};
