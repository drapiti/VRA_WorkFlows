System.log("Retire Server - Synch Operator Data");
try  {	
	var UpdatedDate			= "CURRENT_TIMESTAMP";
	var FarmObjectId		= new Array();
	
	if(Server_Data && Server_Data.length > 0){				
		for(var i=0; i<Server_Data.length; i++) {	
			var updateQuery = "UPDATE FarmObject SET State='Retired', ServiceProfile='-', ClusterId = 1, UpdatedDate = "+UpdatedDate+", UpdatedBy = '"+user+"' WHERE Id = "+Server_Data[i].FarmObjectId+";";
			var result = cmdb.executeCustomQuery(updateQuery);
		
			if ( result == 1 )  {
				System.log( "Row ("+Server_Data[i].FarmObjectId+") updated in LUN table successfully" );
			} else  {
				System.error( "Row updated in LUN table failed" );
			}							
			
			if(ReservationId && ReservationId.length > 0){									
				var deleteQuery = "DELETE FROM Reservation WHERE FarmObjectId="+Server_Data[i].FarmObjectId+";"; 																								 
				var result = cmdb.executeCustomQuery(deleteQuery);
		
				if ( result > 0 )  {
					System.log( "Row with FarmObjectId ("+Server_Data[i].FarmObjectId[i]+") was deleted from table Reservation successfully" );
				} else  {
					System.error( "Row delete failed in table Reservation" );
				}								
			}
			
			if(Port_Data && Port_Data.length > 0) {
				for(var z=0; z<Port_Data.length; z++){
					var updateQuery = "UPDATE Port Set State='Down', UpdatedDate = "+UpdatedDate+", UpdatedBy = '"+user+"' WHERE Id = "+Port_Data[z].PortId+" AND FarmObjectId="+Server_Data[i].FarmObjectId+";"; 																																																																			 
					var result = cmdb.executeCustomQuery(updateQuery);
		
					if ( result > 0 )  {
						System.log( "Row with Id ('"+Port_Data[z].PortId+"') was successfully updated in table Port" );
					} else  {
						System.error( "Row update failed in table Port" );
					}								
				}			
			}																			
		}
		if(Delete_LUNs && Delete_LUNs.length > 0){
			for(var j=0; j<Delete_LUNs.length; j++){																																																														
				var deleteQuery = "DELETE FROM Lun WHERE Id = "+Delete_LUNs[j].LunId+" AND FarmObjectId="+Delete_LUNs[j].FarmObjectId+";";
				var result = cmdb.executeCustomQuery(deleteQuery);
		
				if ( result > 0 )  {
					System.log( "Row with LunId ('"+Delete_LUNs[j].LunId+"') was deleted from table Lun and LunMap successfully" );
				} else  {
					System.error( "Row delete failed in table Lun and LunMap" );
				}								
			}
		}
				
		if(ProdActiveNodes.length > 1){ //We have a cluster therefore additional operations may be required.
			if(ProdActiveNodes[0]==Server_Data[0].FarmObjectId){ //If the LUNs in the LUN table are mapped to the node which is to be retired 
					//then we need to reassign the LUNs to the first cluster node which is not retired. ie. ProdActiveNodes[1] 
				var updateQuery = "UPDATE Lun Set FarmObjectId="+ProdActiveNodes[1]+" WHERE FarmObjectId="+ProdActiveNodes[0]+";";
				var result = cmdb.executeCustomQuery(updateQuery);
				
				if ( result > 0 )  {
					System.log( "Rows with FarmObjectId ('"+ProdActiveNodes[0]+"') were updated in the table Lun successfully" );
				} else  {
					System.error( "Row update failed in table Lun" );
				}		
				//We update the LunMap table also in the case that the primary node is now replaced by ProdActiveNodes[1]  
				for(var j=0; j<UnMap_LUNs.length; j++){
					var updateQuery = "UPDATE LunMap Set FarmObjectId="+ProdActiveNodes[1]+" WHERE FarmObjectId="+ProdActiveNodes[0]+" AND LunId = "+UnMap_LUNs[j].LunId+";";
					var result = cmdb.executeCustomQuery(updateQuery);
					if ( result > 0 )  {
						System.log( "Rows with FarmObjectId ('"+ProdActiveNodes[0]+"') were successfully updated in the table LunMap" );
					} else  {
						System.error( "Row update failed in table LunMap" );
					}
				}
			}			
		}			
		
		if(DRActiveNodes.length > 1){
				if(DRActiveNodes[0]==Server_Data[1].FarmObjectId){
					var updateQuery = "UPDATE Lun Set FarmObjectId="+DRActiveNodes[1]+" WHERE FarmObjectId="+DRActiveNodes[0]+";";
					var result = cmdb.executeCustomQuery(updateQuery);
					
					if ( result > 0 )  {
						System.log( "Row with LunId ('"+UnMap_LUNs[j].LunId+"') was updated in table Lun successfully" );
					} else  {
						System.error( "Row delete failed in table LunMap" );
					}
					for(var j=0; j<UnMap_LUNs.length; j++){
						var updateQuery = "UPDATE LunMap Set FarmObjectId="+DRActiveNodes[1]+" WHERE FarmObjectId="+DRActiveNodes[0]+" AND LunId = "+UnMap_LUNs[j].LunId+";";
						var result = cmdb.executeCustomQuery(updateQuery);
						if ( result > 0 )  {
							System.log( "Rows with FarmObjectId ('"+DRActiveNodes[0]+"') were successfully updated in the table LunMap" );
						} else  {
							System.error( "Row update failed in table LunMap" );
						}
					}
				}										
			}	
		
		//At this point we make sure we remove any other record from the LunMap table which no longer reflects the LUN Map situation.
		if(UnMap_LUNs && UnMap_LUNs.length > 0){
			for(var j=0; j<UnMap_LUNs.length; j++){
				var deleteQuery = "DELETE FROM LunMap WHERE LunId = "+UnMap_LUNs[j].LunId+" AND FarmObjectId="+UnMap_LUNs[j].FarmObjectId+";";
				var result = cmdb.executeCustomQuery(deleteQuery);
		
				if ( result > 0 )  {
					System.log( "Row with LunId ('"+UnMap_LUNs[j].LunId+"') and FarmObjectId ('"+UnMap_LUNs[j].FarmObjectId+"')  was deleted from table LunMap successfully" );
				} else  {
					System.error( "Row delete failed in table LunMap" );
				}
			}
		}
		// We remove the cluster name if it is no longer associated to any node.
		if(ClusterId[0] > 2){		
			var selectQuery = "SELECT Id From FarmObject WHERE ClusterId="+ClusterId[0]+" AND State='Active';";
			System.log( "selectQuery >"+selectQuery );
			var res = cmdb.readCustomQuery(selectQuery);
			if(res.length == 0){ //If there are no more Active nodes then delete the cluster.			
				var deleteQuery = "DELETE FROM Cluster WHERE Id="+ClusterId[0]+";"; 																																																																			 
				var result = cmdb.executeCustomQuery(deleteQuery);
		
				if ( result > 0 )  {
					System.log( "Row with Id ("+ClusterId[0]+") was deleted from table Cluster successfully" );
				} else  {
					System.error( "Row delete failed in table Cluster" );
				}
			}					
		}
		if(ClusterId[1] > 2){		
			var selectQuery = "SELECT Id From FarmObject WHERE ClusterId="+ClusterId[1]+" AND State='Active';";
			System.log( "selectQuery >"+selectQuery );
			var res = cmdb.readCustomQuery(selectQuery);
			if(res.length == 0){ // If there are no more Active nodes then delete the DR cluster.			
				var deleteQuery = "DELETE FROM Cluster WHERE Id="+ClusterId[1]+";"; 																																																																			 
				var result = cmdb.executeCustomQuery(deleteQuery);
		
				if ( result > 0 )  {
					System.log( "Row with Id ("+ClusterId[1]+") was deleted from table Cluster successfully" );
				} else  {
					System.error( "Row delete failed in table Cluster" );
				}
			}					
		}																																																															
	}
	insRequest(vraRequestId, "CURRENT_TIMESTAMP", user, owner, ProjectId, "COMPLETED", "Support", tenant);																							
 }catch(ex){
	throw "Retire Server - Synch Operator Data - ERROR: "+ex;
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
