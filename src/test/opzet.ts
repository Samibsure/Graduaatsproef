import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Gedeelde opzet voor de componenttests.
 *
 * Zonder cleanup() blijft de vorige render in het document staan en vinden
 * queries als getByText er twee: tests die apart slagen, falen dan samen.
 */
afterEach(cleanup);
