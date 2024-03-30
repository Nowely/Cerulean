import {v4} from "uuid";

export class Base {
	id = v4()
	createOn = Date.now()
	modifiedOn = Date.now()
}