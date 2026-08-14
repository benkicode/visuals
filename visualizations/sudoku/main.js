import { Application } from "@hotwired/stimulus";
import FlapController from "../../shared/controllers/flap_controller.js";
import BoardController from "./controllers/board_controller.js";

const app = Application.start();
app.register("flap", FlapController);
app.register("board", BoardController);
