import {STATUS, TODO_TYPE} from "../Pages/Tasks/constants";
import axios from "axios";
import {v4} from "uuid";

export class Affair {
    id: string = v4();
    title: string = "";
    note: string = "";
    checklist: string[] = [];
    active: boolean = true;
    status: STATUS = STATUS.Absent;
    difficulty: string = "";
    type: TODO_TYPE = TODO_TYPE.None; //Column type from title
    color: string = ""; //Green, Red, Common task
    dueDate: string | null = null;
    tags: string[] = [];


    update = async (affair: Affair) => {
        debugger
        let id = this.id
        ///{...affair};
        try {
            await axios.put(`affair`, affair);
        } catch (e) {
            console.error(e);
        }
    }

    delete = async () => {
        try {
            await axios.delete(`affair`, {params: {id: this.id}});
        } catch (e) {
            console.error(e);
        }
    }
}