const faker = require("faker")
//import {Affair} from "./Models/Affair";
//import faker from "faker";
//import {AffairType, Status} from "./Pages/Tasks/constants";

//todo change port, add new script command
module.exports = () => {

	const data = { affairs: [] }
	for (let i = 0; i < 50; i++) {
		let affair = {};
		affair.title = faker.name.jobTitle();
		affair.note = faker.name.jobDescriptor();
		affair.status = Math.random() * (Object.keys(4).length - 1) + 1;
		affair.type = Math.random() * (Object.keys(5).length - 1) + 1;
		data.affairs.push(affair);
	}
	return data
}