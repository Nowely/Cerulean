import {makeAutoObservable} from "mobx";
import {Affair} from "../Models/Affair";
import axios from "axios";
import _ from "lodash";

export class AffairStore {
    data: Affair[] = [];

    constructor() {
        makeAutoObservable(this)
    }

    async get() {
        try {
            const response = await axios.get(`affair`);
            this.data = response.data;
        } catch (e) {
            console.error(e);
        }
    }

    async create(affair: Affair) {
        this.data.push(affair);
        try {
            await axios.post(`affair`, {...affair});
        } catch (e) {
            console.error(e);
        }
    }

    async update(id: string, newState: Partial<Affair>) {
        const affair = this.data.find(value => value.id === id);
        if (!affair) return;
        Object.assign(affair, newState);

        try {
            await axios.put(`affair`, affair);
        } catch (e) {
            console.error(e);
        }
    }

    async delete(id: string) {
        _.remove(this.data, (value) => value.id === id);
        try {
            await axios.delete(`affair`, {params: {id}});
        } catch (e) {
            console.error(e);
        }
    }
}