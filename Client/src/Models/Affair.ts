import {AffairType, Status} from "../Pages/Tasks/constants";
import {v4} from "uuid";

export class Affair {
	id: string = v4()
	title: string = ""
	note: string = ""
	checklist: string[] = []
	active: boolean = true
	status: Status = Status.Absent
	difficulty: string = ""
	type: AffairType = AffairType.None //Column type from title
	color: string = "" //Green, Red, Common task
	dueDate: string | null = null
	tags: string[] = []
}