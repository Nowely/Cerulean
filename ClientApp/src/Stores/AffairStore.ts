import {makeAutoObservable} from "mobx";
import {Affair} from "../Models/Affair";
import axios from "axios";
import _ from "lodash";

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

    data: Affair[] = [];

    get = async () => {
        try {
            const response = await axios.get(`affair`);
            this.data = response.data;
        } catch (e) {
            console.error(e);
        }
    }

    create = async (affair: Affair) => {
        this.data.push(affair);
        try {
            await axios.post(`affair`, {...affair});
        } catch (e) {
            console.error(e);
        }
    }

    update = async (id: string, newState: Partial<Affair>) => {
        const affair = this.data.find(value => value.id === id);
        if (!affair) return;
        Object.assign(affair, newState);

        try {
            await axios.put(`affair`, affair);
        } catch (e) {
            console.error(e);
        }
    }

    delete = async (id: string) => {
        _.remove(this.data, (value) => value.id === id);
        try {
            await axios.delete(`affair`, {params: {id}});
        } catch (e) {
            console.error(e);
        }
    }
}