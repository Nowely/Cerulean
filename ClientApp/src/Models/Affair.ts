import {STATUS, AffairType} from "../Pages/Tasks/constants";
import axios from "axios";
import {v4} from "uuid";
import {makeAutoObservable} from "mobx";

export class Affair {
    id: string = v4();
    title: string = "";
    note: string = "";
    checklist: string[] = [];
    active: boolean = true;
    status: STATUS = STATUS.Absent;
    difficulty: string = "";
    type: AffairType = AffairType.None; //Column type from title
    color: string = ""; //Green, Red, Common task
    dueDate: string | null = null;
    tags: string[] = [];

    constructor() {
        makeAutoObservable(this)
    }

    update = async () => {
        try {
            await axios.put(`affair`, this);
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