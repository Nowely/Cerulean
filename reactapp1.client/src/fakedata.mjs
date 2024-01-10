import {Affair} from "./Models/Affair";
import faker from 'faker';
import {AffairType, Status} from "./Pages/Tasks/constants";

/*interface api {
	affairs: Affair[],
}
let database: api = {
	affairs: [],
};*/
let database = {
	affairs: [],
};

for (let i = 1; i<= 50; i++) {
	let affair = new Affair();
	affair.title = faker.name.jobTitle();
	affair.note = faker.name.jobDescriptor();
	affair.status = Math.random() * (Object.keys(Status).length - 1) + 1;
	affair.type = Math.random() * (Object.keys(AffairType).length - 1) + 1;
	database.affairs.push(affair);
}
