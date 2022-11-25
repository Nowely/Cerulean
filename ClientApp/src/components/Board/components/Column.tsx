import {AffairType} from "../../../Pages/Tasks/constants";
import {Button, Card, Col} from "antd";
import {PlusOutlined} from "@ant-design/icons";
import {AffairStore} from "../../../Stores/AffairStore";
import {Affair} from "../../../Models/Affair";
import {useState} from "react";

export const Column = ({type}: { type: AffairType }) => {
    const [filterTab, setFilterTab] = useState(0);

    const itemsFilter = ((value: Affair) => {
        switch (filterTab) {
            case 0:
                return value.active;
            default:
                return value.status === filterTab;
        }
    });

    const data = AffairStore.instance.data;

    return (
        <Col span={3}
             style={{
                 marginTop: 8,
                 marginLeft: 8, 
                 marginRight: 8, 
                 paddingLeft: 6,
                 paddingTop: 6,
                 backgroundColor: 'lightcyan'}}
        >
            {data.filter(task => task?.type === type).filter(itemsFilter).map(value =>
                <Card key={value.id} size="small">
                    {value.title}
                </Card>
            )}
            <Button block type="text" icon={<PlusOutlined/>} style={{flexFlow: 'column'}}>
                New
            </Button>
        </Col>
    )
}