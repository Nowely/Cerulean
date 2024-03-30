import {AffairsColumn} from './AffairsColumn'
import {AffairType} from "./constants";
import {useEffect} from "react";
import {Container} from "@mui/material";
import {store} from "../../Stores/Store";

const classes = {
    container: `Layout-container`,
};

export const Tasks = () => {
    useEffect(() => {
        //TODO caching?
        store.affairs.get();
    }, []);

    return <Container maxWidth={false} disableGutters={true} className={classes.container}>
        <AffairsColumn type={AffairType.Daily}/>
        <AffairsColumn type={AffairType.Week}/>
        <AffairsColumn type={AffairType.Month}/>
        <AffairsColumn type={AffairType.Year}/>
    </Container>
}