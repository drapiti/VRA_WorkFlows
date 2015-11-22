System.log("Remove LUN - User Form Data");

try  {

	user		= __asd_requestedFor;
	user		= user.split("@");
	user		= user[0];
	
	Lun_Delete 	= new Array(); 
	Lun_UnMap	= new Array();
		
	//Define Prod and DR Naming Convention
	if(tenant != "ISP"){
		if(Hostname.indexOf("OVM-PP") == -1){
			var DRHostname 	= "DR-"+Hostname;
			System.log("DRHostname:"+DRHostname);	
		}
		else {
			var DRHostname	= Hostname;
			DRHostname = DRHostname.split("OVM-PP").join("OVM-SD"); 
			System.log("DRHostname:"+DRHostname);
		}
		if(Cluster.indexOf("OVM-PP-") == -1 && Cluster.indexOf("STANDALONE") == -1){
			var DRCluster	= "DR-"+Cluster;
			System.log("DRCluster:"+DRCluster);
		}
		else {
			var DRCluster 	= Cluster;
			DRCluster 		= DRCluster.split("OVM-PP-").join("OVM-SD-"); 
			System.log("DRCluster:"+DRCluster);
		}
	}
	else if(tenant == "ISP"){
		if(Hostname.indexOf("-PP") > -1){
			var DRHostname	= Hostname;
			DRHostname = DRHostname.split("-PP").join("-SD");	 		
			System.log("DRHostname:"+DRHostname);
		}
		//TODO: Add any ISP naming convention exceptions
		if(Cluster.indexOf("-PP-") > -1){
			var DRCluster 	= Cluster;
			DRCluster = DRCluster.split("-PP-").join("-SD-"); 		
			System.log("DRCluster:"+DRCluster);
		}
		else {
			var DRCluster 	= Cluster;
		}									
	}	
		
	if(Cluster == "STANDALONE"){ //Remove Lun From Lun table	
		if(!RemoveAll) { //Remove a single LUN from one server
				
			var selectQuery = "SELECT L.Id, LunScsiId, Size, FarmObjectId FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name='"+Hostname+"' AND F.Serial='"+Serial+"' AND UidSerial='"+UIDSerial+"';";	
			System.log("selectQuery:"+selectQuery);
				
			var res = cmdb.readCustomQuery(selectQuery);
			if(res){		
				for(var x in res){
					var lun 						= new Object();	
					lun.ForeignBank					= tenant;			
					lun.Hostname					= Hostname;
					lun.Serial						= Serial;
					lun.ScsiId						= res[x].getProperty("LunScsiId");
					lun.UidSerial					= UIDSerial; 								
					lun.Size 						= res[x].getProperty("Size");
					lun.LunId						= res[x].getProperty("Id");
					lun.FarmObjectId				= res[x].getProperty("FarmObjectId");
					Lun_Delete.push(lun);												
				}
			}
			var selectQuery = "SELECT L.Id, UidSerial, L.FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name='"+DRHostname+"' AND LunScsiId="+Lun_Delete[0].ScsiId+" AND Size="+Lun_Delete[0].Size+";";	
			System.log("lunQuery:"+selectQuery);				
			var res = cmdb.readCustomQuery(selectQuery);
			if(res){
				for(var j in res){
					var lun = new Object();	
					lun.ForeignBank					= tenant;			
					lun.Hostname					= DRHostname;
					lun.Serial						= res[j].getProperty("Serial"); 
					lun.ScsiId						= Lun_Delete[0].ScsiId;
					lun.UidSerial					= res[j].getProperty("UidSerial"); 								
					lun.Size 						= Lun_Delete[0].Size;
					lun.LunId						= res[j].getProperty("Id");
					lun.FarmObjectId				= res[j].getProperty("FarmObjectId");
					Lun_Delete.push(lun);
				}
			}																																																																																																																	
		}
		else if (RemoveAll) {		
			//Get LUN Data for operator			
			var selectQuery = "SELECT L.Id, LunScsiId, Size, UidSerial, FarmObjectId FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name = "+Hostname+" AND F.Serial = '"+Serial+"';";	
			System.log("selectQuery:"+selectQuery);
				
			var res = cmdb.readCustomQuery(selectQuery);
			if(res){		
				for(var x in res){
					var lun = new Object();				
					lun.ForeignBank					= tenant;
					lun.Hostname					= Hostname;
					lun.Serial						= Serial;
					lun.ScsiId						= res[x].getProperty("LunScsiId");
					lun.UidSerial					= res[x].getProperty("UidSerial");								
					lun.Size 						= res[x].getProperty("Size");
					lun.LunId						= res[x].getProperty("Id");
					lun.FarmObjectId				= res[x].getProperty("FarmObjectId");
					Lun_Delete.push(lun);
				}		
			}	
	
			var selectQuery = "SELECT L.Id, LunScsiId, Size, UidSerial, FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name = '"+DRHostname+"';";	
			System.log("selectQuery:"+selectQuery);
				
			var res = cmdb.readCustomQuery(selectQuery);
			if(res){		
				for(var x in res){
					var lun = new Object();				
					lun.ForeignBank					= tenant;
					lun.Hostname					= DRHostname;
					lun.Serial						= res[x].getProperty("Serial");
					lun.ScsiId						= res[x].getProperty("LunScsiId");
					lun.UidSerial					= res[x].getProperty("UidSerial");								
					lun.Size 						= res[x].getProperty("Size");
					lun.LunId						= res[x].getProperty("Id");
					lun.FarmObjectId				= res[x].getProperty("FarmObjectId");
					Lun_Delete.push(lun);
				}		
			}									
		}
	}
	else if (Cluster != "STANDALONE") {		
		Nodes	 	= new Array();	
		DRNodes	 	= new Array();
		//Get Nodes of cluster
		var selectQuery = "SELECT F.Id FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id WHERE C.Name = '"+Cluster+"';";										
		var res = cmdb.readCustomQuery(selectQuery);
		if(res){		
			for(var x in res){
				Nodes[x]	= res[x].getProperty("Id");							
			}	
		}	
		
		var selectQuery = "SELECT F.Id FROM FarmObject as F JOIN Cluster as C ON F.ClusterId=C.Id WHERE C.Name = '"+DRCluster+"';";										
		var res = cmdb.readCustomQuery(selectQuery);
		if(res){		
			for(var x in res){
				DRNodes[x]	= res[x].getProperty("Id");							
			}	
		}
		
		if(Nodes.length > 1) { // Fai solo Unmap della LUN visto che essistono più nodi
			//Production Nodes
			if(!RemoveAll) {			
				var selectQuery = "SELECT L.Id, L.LunScsiId, L.Size, L.FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name='"+Hostname+"' AND L.UidSerial='"+UIDSerial+"' AND L.IsBootLun='false';";	
				System.log("selectQuery:"+selectQuery);
			
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var map 						= new Object();		
						map.ForeignBank					= tenant;				
						map.Hostname					= Hostname;
						map.Serial						= res[x].getProperty("Serial");
						map.ScsiId						= res[x].getProperty("LunScsiId");
						map.UidSerial					= UIDSerial; 								
						map.Size 						= res[x].getProperty("Size");
						map.LunId						= res[x].getProperty("Id");
						map.FarmObjectId				= res[x].getProperty("FarmObjectId");					
						Lun_UnMap.push(map);
					}
				}
				var selectQuery = "SELECT L.Id, L.LunScsiId, L.Size, L.FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name='"+Hostname+"' AND L.UidSerial='"+UIDSerial+"' AND L.IsBootLun='true';";	
				System.log("selectQuery:"+selectQuery);
			
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 						= new Object();		
						lun.ForeignBank					= tenant;				
						lun.Hostname					= Hostname;
						lun.Serial						= res[x].getProperty("Serial");
						lun.ScsiId						= res[x].getProperty("LunScsiId");
						lun.UidSerial					= UIDSerial; 								
						lun.Size 						= res[x].getProperty("Size");
						lun.LunId						= res[x].getProperty("Id");
						lun.FarmObjectId				= res[x].getProperty("FarmObjectId");					
						Lun_Delete.push(lun);
					}
				}									
			}																																																						
			else if (RemoveAll) {								
				var selectQuery = "SELECT L.Id, L.LunScsiId, L.UidSerial, L.Size, L.FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name='"+Hostname+"' AND L.IsBootLun='false';";	
				System.log("selectQuery:"+selectQuery);
				
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var map 						= new Object();		
						map.ForeignBank					= tenant;				
						map.Hostname					= Hostname;
						map.Serial						= res[x].getProperty("Serial");
						map.ScsiId						= res[x].getProperty("LunScsiId");
						map.UidSerial					= UIDSerial; 								
						map.Size 						= res[x].getProperty("Size");
						map.LunId						= res[x].getProperty("Id");
						map.FarmObjectId				= res[x].getProperty("FarmObjectId");						
						Lun_UnMap.push(map);
					}		
				}	
					
				var selectQuery = "SELECT L.Id, L.LunScsiId, L.UidSerial, L.Size, L.FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name='"+Hostname+"' AND L.IsBootLun='true';";	
				System.log("selectQuery:"+selectQuery);
				
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 						= new Object();		
						lun.ForeignBank					= tenant;				
						lun.Hostname					= Hostname;
						lun.Serial						= res[x].getProperty("Serial");
						lun.ScsiId						= res[x].getProperty("LunScsiId");
						lun.UidSerial					= UIDSerial; 								
						lun.Size 						= res[x].getProperty("Size");
						lun.LunId						= res[x].getProperty("Id");
						lun.FarmObjectId				= res[x].getProperty("FarmObjectId");						
						Lun_Delete.push(lun);
					}		
				}																				
			}
		}
		else if(Nodes.length == 1) {  //Unico nodo eliminare la LUN
			if(!RemoveAll) {
				var selectQuery = "SELECT L.Id, L.LunScsiId, L.Size, FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name='"+Hostname+"' AND L.UidSerial='"+UIDSerial+"';";	
				System.log("selectQuery:"+selectQuery);
				
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 						= new Object();		
						lun.ForeignBank					= tenant;				
						lun.Hostname					= Hostname;
						lun.Serial						= res[x].getProperty("Serial");
						lun.ScsiId						= res[x].getProperty("LunScsiId");
						lun.UidSerial					= UIDSerial; 								
						lun.Size 						= res[x].getProperty("Size");
						lun.LunId						= res[x].getProperty("Id");
						lun.FarmObjectId				= res[x].getProperty("FarmObjectId");					
						Lun_Delete.push(lun);
					}		
				}																																																			
			}
			else if (RemoveAll) {									
				var selectQuery = "SELECT L.Id, L.LunScsiId, L.UidSerial, L.Size, FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name='"+Hostname+"';";	
				System.log("selectQuery:"+selectQuery);
				
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 						= new Object();		
						lun.ForeignBank					= tenant;				
						lun.Hostname					= Hostname;
						lun.Serial						= res[x].getProperty("Serial");
						lun.ScsiId						= res[x].getProperty("LunScsiId");
						lun.UidSerial					= res[x].getProperty("UidSerial");								
						lun.Size 						= res[x].getProperty("Size");
						lun.LunId						= res[x].getProperty("Id");
						lun.FarmObjectId				= res[x].getProperty("FarmObjecId");					
						Lun_Delete.push(lun);
					}		
				}					
			}	
		}
		if(DRNodes.length > 1) { // Fai solo Unmap della LUN relativo al server in DR visto che essistono più nodi		
			if(!RemoveAll) {
				var selectQuery = "SELECT L.Id, L.UIDSerial, L.Size, L.FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name='"+DRHostname+"' AND L.LunScsiId="+Lun_UnMap[0].ScsiId+" AND L.Size ="+Lun_UnMap[0].Size+" AND IsBootLun='false';";	
				System.log("selectQuery:"+selectQuery);
						
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var map 						= new Object();		
						map.ForeignBank					= tenant;				
						map.Hostname					= DRHostname;
						map.Serial						= res[x].getProperty("Serial");
						map.ScsiId						= Lun_UnMap[0].ScsiId;
						map.UidSerial					= res[x].getProperty("UIDSerial");								
						map.Size 						= Lun_UnMap[0].Size;
						map.LunId						= res[x].getProperty("Id");
						map.FarmObjectId				= res[x].getProperty("FarmObjectId");						
						Lun_UnMap.push(map);
					}		
				}

	
				var selectQuery = "SELECT L.Id, L.UIDSerial, L.Size, L.FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name='"+DRHostname+"' AND L.LunScsiId="+Lun_Delete[0].ScsiId+" AND L.Size ="+Lun_Delete[0].Size+" AND IsBootLun='true';";	
				System.log("selectQuery:"+selectQuery);
						
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 						= new Object();		
						lun.ForeignBank					= tenant;				
						lun.Hostname					= DRHostname;
						lun.Serial						= res[x].getProperty("Serial");
						lun.ScsiId						= Lun_Delete[0].ScsiId;
						lun.UidSerial					= res[x].getProperty("UIDSerial");								
						lun.Size 						= Lun_Delete[0].Size;
						lun.LunId						= res[x].getProperty("Id");
						lun.FarmObjectId				= res[x].getProperty("FarmObjectId");						
						Lun_Delete.push(lun);
					}		
				}																																																																																																			
			}
			else if (RemoveAll) {								
				var selectQuery = "SELECT L.Id, L.LunScsiId, L.UidSerial, L.Size, L.FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name = '"+DRHostname+"' AND L.IsBootLun='false';";	
				System.log("selectQuery:"+selectQuery);
				
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var map 						= new Object();		
						map.ForeignBank					= tenant;				
						map.Hostname					= DRHostname;
						map.Serial						= res[x].getProperty("Serial");
						map.ScsiId						= res[x].getProperty("LunScsiId");
						map.UidSerial					= res[x].getProperty("UIDSerial");								
						map.Size 						= res[x].getProperty("Size");
						map.LunId						= res[x].getProperty("Id");
						map.FarmObjectId				= res[x].getProperty("FarmObjectId");						
						Lun_UnMap.push(map);
					}		
				}
				
				var selectQuery = "SELECT L.Id, L.LunScsiId, L.UidSerial, L.Size, L.FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name = '"+DRHostname+"' AND L.IsBootLun='true';";	
				System.log("selectQuery:"+selectQuery);
				
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 						= new Object();		
						lun.ForeignBank					= tenant;				
						lun.Hostname					= DRHostname;
						lun.Serial						= res[x].getProperty("Serial");
						lun.ScsiId						= res[x].getProperty("LunScsiId");
						lun.UidSerial					= res[x].getProperty("UIDSerial");								
						lun.Size 						= res[x].getProperty("Size");
						lun.LunId						= res[x].getProperty("Id");
						lun.FarmObjectId				= res[x].getProperty("FarmObjectId");						
						Lun_Delete.push(lun);
					}		
				}														
			}			
		}		
		else if (DRNodes.length == 1){
			if(!RemoveAll) {
				if(Lun_Delete[0]){
					var selectQuery = "SELECT L.Id, L.UIDSerial, L.Size, L.FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name= '"+DRHostname+"' AND L.LunScsiId="+Lun_Delete[0].ScsiId+" AND L.Size ="+Lun_Delete[0].Size+";";	
					System.log("selectQuery:"+selectQuery);				
						
					var res = cmdb.readCustomQuery(selectQuery);
					if(res){		
						for(var x in res){
							var lun 						= new Object();		
							lun.ForeignBank					= tenant;				
							lun.Hostname					= DRHostname;
							lun.Serial						= res[x].getProperty("Serial");
							lun.ScsiId						= Lun_Delete[0].ScsiId;			//Use Lun_UnMap since Prod is cluster lun must be unmapped not deleted
							lun.UidSerial					= res[x].getProperty("UIDSerial");								
							lun.Size 						= Lun_Delete[0].Size;			//Use Lun_UnMap since Prod is cluster lun must be unmapped not deleted
							lun.LunId						= res[x].getProperty("Id");
							lun.FarmObjectId				= res[x].getProperty("FarmObjectId");						
							Lun_Delete.push(lun);
						}		
					}
				}
				//Important this section is required in case SCSI and SIZE of lun info is in LUN_MAP and not LUN_Delete where in production we may be in the presence of multiple nodes.
				if(Lun_UnMap[0]){
					var selectQuery = "SELECT L.Id, L.UIDSerial, L.Size, L.FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name= '"+DRHostname+"' AND L.LunScsiId="+Lun_UnMap[0].ScsiId+" AND L.Size ="+Lun_UnMap[0].Size+";";	
					System.log("selectQuery:"+selectQuery);				
						
					var res = cmdb.readCustomQuery(selectQuery);
					if(res){		
						for(var x in res){
							var lun 						= new Object();		
							lun.ForeignBank					= tenant;				
							lun.Hostname					= DRHostname;
							lun.Serial						= res[x].getProperty("Serial");
							lun.ScsiId						= Lun_UnMap[0].ScsiId;			//Use Lun_UnMap since Prod is cluster lun must be unmapped not deleted
							lun.UidSerial					= res[x].getProperty("UIDSerial");								
							lun.Size 						= Lun_UnMap[0].Size;			//Use Lun_UnMap since Prod is cluster lun must be unmapped not deleted
							lun.LunId						= res[x].getProperty("Id");
							lun.FarmObjectId				= res[x].getProperty("FarmObjectId");						
							Lun_Delete.push(lun);
						}		
					}
				}																																																																																																															
			}
			else if (RemoveAll) {									
				var selectQuery = "SELECT L.Id, L.LunScsiId, L.UidSerial, L.Size, L.FarmObjectId, F.Serial FROM Lun as L JOIN FarmObject as F ON L.FarmObjectId=F.Id WHERE F.Name='"+DRHostname+"';";
				System.log("selectQuery:"+selectQuery);
					
				var res = cmdb.readCustomQuery(selectQuery);
				if(res){		
					for(var x in res){
						var lun 						= new Object();		
						lun.ForeignBank					= tenant;				
						lun.Hostname					= DRHostname;
						lun.Serial						= res[x].getProperty("Serial");
						lun.ScsiId						= res[x].getProperty("LunScsiId");
						lun.UidSerial					= res[x].getProperty("UIDSerial");								
						lun.Size 						= res[x].getProperty("Size");
						lun.LunId						= res[x].getProperty("Id");
						lun.FarmObjectId				= res[x].getProperty("FarmObjectId");						
						Lun_Delete.push(lun);
					}		
				}						
			}
		}																																					
	}
	var ProjectId = getProjectID("Project", "ProjectCode", ProjectCode);			
	
	for each (var customerAdmin in customerAdmins){
		if(tenant == customerAdmin.tenant){
			customer_ldapUser = customerAdmin.admins;
		}
	}
	
	var vcac_cafeHost;
	for each (var cafeHost in cafeHosts){
		if(tenant == cafeHost.tenant){
			vcac_cafeHost = cafeHost.vCacHost;
		}
	}
	
	var req = vCACCAFEEntitiesFinder.getCatalogItemRequest(vcac_cafeHost, __asd_catalogRequestId);  	 	
	var vraRequestId = req.requestNumber;
	System.log(vraRequestId);

	insRequest(vraRequestId, "0000-00-00", user, user, ProjectId, state, "Storage SAN", tenant); 	
																																										
} catch(ex){
	throw "Remove LUN - User Form Data - ERROR: "+ex;
}

function getID(hostname, serial) {
	
	var selectQuery = "SELECT F.Id FROM FarmObject as F WHERE F.Name ='" + hostname + "' AND Serial = '" + serial + "';";
	
	System.log( "selectQuery >" + selectQuery );
	
	var result = cmdb.readCustomQuery(selectQuery);

	var returnId;
	if(result.length == 1) {
		returnId = result[0].getProperty("Id");
	}
	
	return returnId;
}

function getProjectID(tableName, param, value) {
	
	var selectQuery = "SELECT Id FROM " + tableName + " WHERE " + param + " = '" + value + "';"; 
	
	System.log( "selectQuery >" + selectQuery );
	
	var result = cmdb.readCustomQuery(selectQuery);
	System.log( "result >" + result );
	
	var returnId;
	if(result.length == 1) {
		returnId = result[0].getProperty("Id");
	}
	
	return returnId;
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
