import {AffairsColumn} from './AffairsColumn'
import {AffairType} from "./constants";
import {useEffect} from "react";
import {AffairStore} from "../../Stores/AffairStore";

export const Tasks = () => {
    useEffect(() => {
        AffairStore.instance.get();
    }, []);

    return <>
        <AffairsColumn type={AffairType.Daily}/>
        <AffairsColumn type={AffairType.Week}/>
        <AffairsColumn type={AffairType.Month}/>
        <AffairsColumn type={AffairType.Year}/>
    </>
}