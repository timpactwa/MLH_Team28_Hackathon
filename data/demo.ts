import { Layout, Room } from "@/lib/schema";
import layoutRaw from "./demo-layout.json";
import roomRaw from "./demo-room.json";

/** The prepared example room (T-203). Dimensions are examples, not measurements. */
export const demoRoom: Room = Room.parse(roomRaw);

/** A starting layout with one deliberate problem: the sofa sits in the door swing. */
export const demoLayout: Layout = Layout.parse(layoutRaw);
