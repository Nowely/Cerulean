import {makeAutoObservable} from "mobx";
import {Affair} from "../Models/Affair";
import axios from "axios";

export class AffairStore {
    //region Singleton
    private static _instance: AffairStore;

    private constructor() {
        makeAutoObservable(this)
    }

    static get instance(): AffairStore {
        return this._instance || (this._instance = new this());
    }

    //endregion

    affairs: Affair[] = [];


    get = async (callback: { (response: any): void; call?: any; }) => {
        try {
            const response = await axios.get(`affair`);
            callback.call(null, response);
        } catch (e) {
            console.error(e);
        }
    }

    create = async (affair : Affair) => {
        try {
            await axios.post(`affair`, {...affair});
        } catch (e) {
            console.error(e);
        }
    }

    update = async (affair: Affair) => {

        affair.update(new Affair());
        /*try {
            await axios.put(`affair`, affair);
        } catch (e) {
            console.error(e);
        }*/
    }
    delete = async (id: string) => {
        /*try {
            await axios.delete(`affair`, {params: {id}});
        } catch (e) {
            console.error(e);
        }*/
    }
}