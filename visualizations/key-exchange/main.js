import { Application } from "@hotwired/stimulus";
import KeyexchangeController from "./controllers/keyexchange_controller.js";

const app = Application.start();
app.register("exchange", KeyexchangeController);
