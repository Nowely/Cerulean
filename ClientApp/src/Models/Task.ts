import {STATUS, TODO_TYPE} from "../Pages/Tasks/constants";
import axios from "axios";

export class Task {
    id!: string;
    title!: string;
    note!: string;
    checklist!: string[];
    active!: boolean;
    status!: STATUS;
    difficulty!: string;
    type!: TODO_TYPE; //Column type from title
    color!: string; //Green, Red, Common task
    dueDate!: string | null;
    tags!: string[];

    static get = async (callback: { (response: any): void; call?: any; }) => {
        try {
            const response = await axios.get(`task`);
            callback.call(null, response);
        } catch (e) {
            console.error(e);
        }
    }
    static create = async (task : Task) => {
        try {
            await axios.post(`task`, {...task});
        } catch (e) {
            console.error(e);
        }
    }
    static update = async (task: Task) => {
        try {
            await axios.put(`task`, task);
        } catch (e) {
            console.error(e);
        }
    }
    static delete = async (id: string) => {
        try {
            await axios.delete(`task`, {params: {id}});
        } catch (e) {
            console.error(e);
        }
    }
}