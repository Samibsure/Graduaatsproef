import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Taalbewuste vervangers voor Link, useRouter en usePathname. Ze houden de
 * actieve taal vast bij navigatie, zodat een Franstalige gebruiker niet
 * halverwege in het Nederlands belandt.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
