System.log( workflow.name + " - Synch Operator Data");

try  {
	var dataLunId 	= new Array();
	//RDM luns vary greatly here we need to test to 
	// make sure a DR LUN has not been removed by checking that LUNs are a pair.
	//If there is a DR lun Data_LUNs will always contain a multiple of 2.
	if(Data_LUNs.length % 2 === 0)
		var lunDiv		= Data_LUNs.length/2;
	else
		var lunDiv		= Data_LUNs.length;
		
	if(Data_LUNs && Data_LUNs.length > 0) {
		for(var v=0; v<lunDiv; v++) {
			dataLunId[v] = insLUN(Data_LUNs[v], false, Nodes[0]);
			for(var i=0; i<Nodes.length; i++){
				insLunMap(dataLunId[v], Nodes[i]);
			}
		}
		if(Data_LUNs.length % 2 === 0 && DRNodes.length >0){
			for(var z=lunDiv; z<Data_LUNs.length; z++) {
				dataLunId[z] = insLUN(Data_LUNs[z], false, DRNodes[0]);
				for(var i=0; i<DRNodes.length; i++){
					insLunMap(dataLunId[z], DRNodes[i]);
				}
			}
		}
	}
		
	insRequest(vraRequestId, "CURRENT_TIMESTAMP", user, owner, ProjectId, "COMPLETED", "Support", tenant);
			
} catch( ex )  {
	throw workflow.name + " - Error: " + ex;
} 

function insLUN(lun, isBootLun, farmObjectId) {

	var sqlStatement = "INSERT INTO Lun(Size, UidSerial, LunLabel, LunScsiId, IsBootLun, CreatedBy, UpdatedBy, LunScenario, CreatedDate, UpdatedDate, VirtualMachineRawDeviceMapped, FarmObjectId) OUTPUT Inserted.Id ";
	
    var CreatedDate		= "CURRENT_TIMESTAMP";
    var UpdatedDate		= "CURRENT_TIMESTAMP";	
	
    sqlStatement = sqlStatement + "VALUES(";
    sqlStatement = sqlStatement + ""+lun.Size+",";			
    sqlStatement = sqlStatement + "'"+lun.UidSerial+"',";								
    sqlStatement = sqlStatement + "'"+lun.LunLabel+"',";	
	sqlStatement = sqlStatement + ""+lun.LunScsiId+",";
	sqlStatement = sqlStatement + "'"+isBootLun+"',";
    sqlStatement = sqlStatement + "'"+user+"',";
    sqlStatement = sqlStatement + "'"+user+"',";
	sqlStatement = sqlStatement + "'"+lun.LunScenario+"',";
    sqlStatement = sqlStatement + ""+CreatedDate+",";		
    sqlStatement = sqlStatement + ""+UpdatedDate+",";
 	sqlStatement = sqlStatement + "'"+lun.VirtualMachineRawDeviceMap+"',";
	sqlStatement = sqlStatement + ""+farmObjectId+"";
	sqlStatement = sqlStatement + ");";

    System.log( "sqlStatement >" + sqlStatement );

	var result = cmdb.readCustomQuery(sqlStatement);
    var lunId;		
	if ( result.length == 1 )  {
		lunId = result[0].getProperty("Id");	
		System.log( "Row ("+lun.Size+") inserted in table successfully" );
		System.log( "LunId = ("+lunId+")" );			
	} else  {
		System.error( "Row insertion in table failed" );
	}					
	return lunId;
}

function insLunMap(lunId, farmobjectId) {

	var sqlStatement = "INSERT INTO LunMap(LunId, FarmObjectId) ";
	sqlStatement = sqlStatement + "VALUES(";
    sqlStatement = sqlStatement + ""+lunId+",";
	sqlStatement = sqlStatement + ""+farmobjectId+"";
	sqlStatement = sqlStatement + ");";
	
	System.log( "sqlStatement >" + sqlStatement );

	var result = cmdb.executeCustomQuery(sqlStatement);

    if ( result == 1 )  {
            System.log( "Row ("+lunId+") inserted in table successfully" );
    } else  {
            System.error( "Row insertion in table failed" );
    }	
}

function insRequest(RequestNumber, CompletedDate, CreatedBy, UpdatedBy, ProjectId, state, Office, Tenant) {

	var CreatedDate			= "CURRENT_TIMESTAMP";
	var Element 			= workflow.name;
	
	var sqlStatement = "INSERT INTO Request(RequestId, Element, CreatedDate, CompletedDate, CreatedBy, UpdatedBy, ProjectId, Action_State, Office, Tenant) OUTPUT Inserted.Id ";
	sqlStatement = sqlStatement + "VALUES(";
    sqlStatement = sqlStatement + "'"+RequestNumber+"',";
	sqlStatement = sqlStatement + "'"+Element+"',";
	sqlStatement = sqlStatement + ""+CreatedDate+",";
	sqlStatement = sqlStatement + ""+CompletedDate+",";
	sqlStatement = sqlStatement + "'"+CreatedBy+"',";
	sqlStatement = sqlStatement + "'"+UpdatedBy+"',";
	sqlStatement = sqlStatement + ""+ProjectId+",";
	sqlStatement = sqlStatement + "'"+state+"',";
	sqlStatement = sqlStatement + "'"+Office+"',";
	sqlStatement = sqlStatement + "'"+Tenant+"'";
	sqlStatement = sqlStatement + ");";
	
	System.log( "sqlStatement >" + sqlStatement );
	var returnId;
	var result = cmdb.readCustomQuery(sqlStatement);
		
	if( result.length == 1 ) {
		returnId = result[0].getProperty("Id");
		System.log( "Row ("+RequestNumber+") inserted in table successfully" );
	}
	else{
        System.error( "Row insertion in table failed" );
    }	
	return returnId;
}
