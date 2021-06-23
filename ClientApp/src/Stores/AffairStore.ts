import {makeAutoObservable} from "mobx";
import {Affair} from "../Models/Affair";
import axios from "axios";
import {AffairType} from "../Pages/Tasks/constants";

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
            let a = new Affair();
            a.title = `Test Task ${this.data.length}`
            a.type = AffairType.Daily
            this.data.push(a)
        }
    }

    create = async (affair : Affair) => {
        this.data.push(affair);
        try {
            await axios.post(`affair`, {...affair});
        } catch (e) {
            console.error(e);
        }
    }

    update = async (id: string) => {
        await this.data.find(value => value.id === id)?.update();
    }

    delete = async (id: string) => {
        await this.data.find(value => value.id === id)?.delete();
    }
}