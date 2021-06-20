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

    static get = async (callback: { (response: any): void; call?: any; }) => {
        try {
            const response = await axios.get(`affair`);
            callback.call(null, response);
        } catch (e) {
            console.error(e);
        }
    }
    static create = async (affair : Affair) => {
        try {
            await axios.post(`affair`, {...affair});
        } catch (e) {
            console.error(e);
        }
    }
    static update = async (affair: Affair) => {
        try {
            await axios.put(`affair`, affair);
        } catch (e) {
            console.error(e);
        }
    }
    static delete = async (id: string) => {
        try {
            await axios.delete(`affair`, {params: {id}});
        } catch (e) {
            console.error(e);
        }
    }
}