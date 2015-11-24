System.log("Remove LUN - Synch Operator Data");

try  {
	
	if(Lun_Delete && Lun_Delete.length > 0){
		for(var i=0; i<Lun_Delete.length; i++){
			var deleteQuery = "DELETE FROM Lun WHERE Id = "+Lun_Delete[i].LunId+";"; 
			var result = cmdb.executeCustomQuery(deleteQuery);
		
			if ( result > 0 )  {
				System.log( "Row with Id ("+Lun_Delete[i].LunId+") was deleted from table Lun and LunMap successfully" );
			} else  {
				System.error( "Row delete failed in table Lun and LunMap" );
			}	
		}	
	}
	
	if(Lun_UnMap && Lun_UnMap.length > 0){
		for(var i=0; i<Lun_UnMap.length; i++){
			var deleteQuery = "DELETE FROM LunMap WHERE LunId = "+Lun_UnMap[i].LunId+" AND FarmObjectId = "+Lun_UnMap[i].FarmObjectId+";"; 
			var result = cmdb.executeCustomQuery(deleteQuery);
			if ( result > 0 )  {
				System.log( "Row with LunId ("+Lun_UnMap[i].LunId+") and FarmObjectId ("+Lun_UnMap[i].FarmObjectId+") was deleted from table LunMap successfully" );
			} else  {
				System.error( "Row delete failed in table LunMap" );
			}			
			
			if(Nodes.length > 1 && Nodes[0] === Lun_UnMap[i].FarmObjectId){
			//If the LUNs in the LUN table are mapped to the node whose LUN is to be unmapped
			//then we need to reassign the LUNs to the first cluster node which has not had LUNs unmapped. ie. Nodes[1] 
				var updateQuery = "UPDATE Lun Set FarmObjectId="+Nodes[1]+" WHERE Id="+Lun_UnMap[i].LunId+";";
				var result = cmdb.executeCustomQuery(updateQuery);
					
				if ( result > 0 )  {
					System.log( "Rows with Id ('"+Lun_UnMap[i].LunId+"') were updated in the table Lun successfully" );
				} else  {
					System.error( "Row update failed in table Lun" );
					}	
				//We update the LunMap table also in the case that the primary node is now replaced by Nodes[1]
				var updateQuery = "UPDATE LunMap Set FarmObjectId="+Nodes[1]+" WHERE FarmObjectId="+Lun_UnMap[i].FarmObjectId+" AND LunId = "+Lun_UnMap[i].LunId+";";
				var result = cmdb.executeCustomQuery(updateQuery);
				if ( result > 0 )  {
					System.log( "Rows with LunId ('"+Lun_UnMap[j].LunId+"') were successfully updated in the table LunMap" );
				} else  {
					System.error( "Row update failed in table LunMap" );
				}
			}
			if(DRNodes.length > 1 && DRNodes[0] === Lun_UnMap[i].FarmObjectId){
				var updateQuery = "UPDATE Lun Set FarmObjectId="+DRNodes[1]+" WHERE Id="+Lun_UnMap[i].LunId+";";
				var result = cmdb.executeCustomQuery(updateQuery);
					
				if ( result > 0 )  {
					System.log( "Rows with Id ('"+Lun_UnMap[i].LunId+"') were updated in the table Lun successfully" );
				} else  {
					System.error( "Row update failed in table Lun" );
				}	
				//We update the LunMap table also in the case that the primary node is now replaced by Nodes[1]
				var updateQuery = "UPDATE LunMap Set FarmObjectId="+DRNodes[1]+" WHERE FarmObjectId="+Lun_UnMap[i].FarmObjectId+" AND LunId = "+Lun_UnMap[i].LunId+";";
				var result = cmdb.executeCustomQuery(updateQuery);
				if ( result > 0 )  {
					System.log( "Rows with LunId ('"+Lun_UnMap[i].LunId+"') were successfully updated in the table LunMap" );
				} else  {
					System.error( "Row update failed in table LunMap" );
				}
			}	
		}
	}	
				
	insRequest(vraRequestId, "CURRENT_TIMESTAMP", user, owner, ProjectId, "COMPLETED", "Storage SAN", tenant);
	
} catch(ex){
	throw "Remove LUN - Synch Operator Data - ERROR: "+ex;
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
