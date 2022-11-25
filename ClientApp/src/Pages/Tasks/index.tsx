import {AffairsColumn} from './AffairsColumn'
import {AffairType} from "./constants";
import {useEffect} from "react";
import {AffairStore} from "../../Stores/AffairStore";
import {Container} from "@mui/material";

const classes = {
    container: `Layout-container`,
};

export const Tasks = () => {
    useEffect(() => {
        //TODO caching?
        AffairStore.instance.get();
    }, []);

    return <Container maxWidth={false} disableGutters={true} className={classes.container}>
        <AffairsColumn type={AffairType.Daily}/>
        <AffairsColumn type={AffairType.Week}/>
        <AffairsColumn type={AffairType.Month}/>
        <AffairsColumn type={AffairType.Year}/>
    </Container>
}