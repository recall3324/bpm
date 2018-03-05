
var process_extend_model = require('../../bpm_resource/models/process_extend_model');
var user_model = require('../../bpm_resource/models/user_model');
var mongoUtils  = require('../../../common/core/mongodb/mongoose_utils');
var mongoose = mongoUtils.init();
var utils = require('../../../../lib/utils/app_utils');
var logger = require('../../../../lib/logHelper').helper;
var xlsx = require('node-xlsx');


/**
 * 工单统计
 * @param org_id 机构id
 * @param proc_code 流程编码
 * @param level  区域等级
 * @param dispatch_time 派单时间
 * @param startDate 插入时间
 * @param endDate 插入时间
 * @returns {Promise}
 */
exports.getStatisticsListPage= function(org_id,proc_code,level,status,dispatch_time,startDate,endDate) {

    var p = new Promise(function(resolve,reject){

        var match={};
        var foreignField;
        //等级为2表示省公司,
        if(level==2){
            match._id=new mongoose.Types.ObjectId(org_id);
            foreignField='province_id';
        } else if(level==3){
            //地市
            foreignField='city_id';
        } else if(level==4){
            //区县
            foreignField='county_id';
        } else if(level==5){
            //网格
            foreignField='grid_id';
        }else if(level==6){
            //渠道
            foreignField='channel_id';
        }
        //状态为1表示为统计顶页只显示当前登录机构
        if(status==1 && level!=2){
            match._id=new mongoose.Types.ObjectId(org_id);
        }else if(level!=2){
            match.org_pid=org_id;
        }
        console.log("match",match);

        //查询统计表
        var statistics={};
        //流程编码
        if(proc_code){
            statistics['proc_code']=proc_code;
        }
        //派单时间
        if(dispatch_time){
            statistics['dispatch_time']=dispatch_time.replace(/\-/g,'');
        }

        var compare={};
        //开始时间
        if(startDate){
            compare['$gte']=new Date(startDate);
        }
        //结束时间
        if(endDate){
            //结束时间追加至当天的最后时间
            compare['$lte']=new Date(endDate+' 23:59:59');
        }
        //时间查询
        if(!isEmptyObject(compare)){
            statistics['insert_time']=compare;
        }

        console.log("statistics",statistics);
        //依机构表为主表，关联统计表和实例表
        user_model.$CommonCoreOrg.aggregate([
            {
                $match: match
            },
            {
                $graphLookup: {
                    from: "common_bpm_proc_task_statistics",
                    startWith: "$_id",
                    connectFromField: "_id",
                    connectToField: foreignField,
                    as: "statistics",
                    restrictSearchWithMatch: statistics
                }
            },
            {
                $unwind : { path: "$statistics", preserveNullAndEmptyArrays: true }
            },
            {
                $lookup: {
                    from: "common_bpm_proc_inst",
                    localField: 'statistics.proc_inst_id',
                    foreignField: "_id",
                    as: "inst"
                }
            },
            {
                $unwind :{ path: "$inst", preserveNullAndEmptyArrays: true }
            },
            {
                $group : {
                    _id : "$_id",
                    org_fullname:{ $first: "$org_fullname" },
                    org_id:{ $first: "$_id" },
                    total:{$sum: { $cond: { if:  { $in: [ "$inst.proc_inst_status", [1,2,3,4] ] }, then:{ $sum: 1 } , else: 0 }}},
                    success:{$sum: { $cond: { if:  { $in: [ "$inst.proc_inst_status", [4] ] }, then:{ $sum: 1 } , else: 0 }}},
                    overtime:{$sum: { $cond: { if:  {$and:[{ $in: [ "$inst.is_overtime", [0] ]},{$in: [ "$inst.proc_inst_status", [4] ]}]}, then:{ $sum: 1 } , else: 0 }}},
                }
            }


        ]).exec(function(err,res){
            if(err){
                reject(utils.returnMsg(false, '1000', '查询统计失败。',null,err));
            }else{
                var result={rows:res,success:true};
                resolve(result);

            }

        })

    });

    return p;
};


/**
 * 导出工单统计查询结果
 * @param org_id 机构id
 * @param proc_code 流程编码
 * @param level  区域等级
 * @param dispatch_time 派单时间
 * @param startDate 插入时间
 * @param endDate 插入时间
 * @returns {Promise}
 */
exports.exportStatisticsList= function(org_id,proc_code,level,status,dispatch_time,startDate,endDate) {

    var p = new Promise(function(resolve,reject){

        var match={};
        var foreignField;
        //等级为2表示省公司,
        if(level==2){
            match._id=new mongoose.Types.ObjectId(org_id);
            foreignField='province_id';
        } else if(level==3){
            //地市
            foreignField='city_id';
        } else if(level==4){
            //区县
            foreignField='county_id';
        } else if(level==5){
            //网格
            foreignField='grid_id';
        }else if(level==6){
            //渠道
            foreignField='channel_id';
        }
        //状态为1表示为统计顶页只显示当前登录机构
        if(status==1 && level!=2){
            match._id=new mongoose.Types.ObjectId(org_id);
        }else if(level!=2){
            match.org_pid=org_id;
        }
        console.log("match",match);

        //查询统计表
        var statistics={};
        //流程编码
        if(proc_code){
            statistics['proc_code']=proc_code;
        }
        //派单时间
        if(dispatch_time){
            statistics['dispatch_time']=dispatch_time.replace(/\-/g,'');
        }

        var compare={};
        //开始时间
        if(startDate){
            compare['$gte']=new Date(startDate);
        }
        //结束时间
        if(endDate){
            //结束时间追加至当天的最后时间
            compare['$lte']=new Date(endDate+' 23:59:59');
        }
        //时间查询
        if(!isEmptyObject(compare)){
            statistics['insert_time']=compare;
        }

        console.log("statistics",statistics);
        //依机构表为主表，关联统计表和实例表
        user_model.$CommonCoreOrg.aggregate([
            {
                $match: match
            },
            {
                $graphLookup: {
                    from: "common_bpm_proc_task_statistics",
                    startWith: "$_id",
                    connectFromField: "_id",
                    connectToField: foreignField,
                    as: "statistics",
                    restrictSearchWithMatch: statistics
                }
            },
            {
                $unwind : { path: "$statistics", preserveNullAndEmptyArrays: true }
            },
            {
                $lookup: {
                    from: "common_bpm_proc_inst",
                    localField: 'statistics.proc_inst_id',
                    foreignField: "_id",
                    as: "inst"
                }
            },
            {
                $unwind :{ path: "$inst", preserveNullAndEmptyArrays: true }
            },
            {
                $group : {
                    _id : "$_id",
                    org_fullname:{ $first: "$org_fullname" },
                    org_id:{ $first: "$_id" },
                    total:{$sum: { $cond: { if:  { $in: [ "$inst.proc_inst_status", [1,2,3,4] ] }, then:{ $sum: 1 } , else: 0 }}},
                    success:{$sum: { $cond: { if:  { $in: [ "$inst.proc_inst_status", [4] ] }, then:{ $sum: 1 } , else: 0 }}},
                    overtime:{$sum: { $cond: { if:  {$and:[{ $in: [ "$inst.is_overtime", [0] ]},{$in: [ "$inst.proc_inst_status", [4] ]}]}, then:{ $sum: 1 } , else: 0 }}},
                }
            }


        ]).exec(function(err,res){
            if(err){
                reject(utils.returnMsg(false, '1000', '查询统计失败。',null,err));
            }else{
                resolve(res);

            }

        })

    });

    return p;
};


/**
 * 工单列表
 * @param org_id
 * @param proc_code
 * @param level
 * @param status
 * @param dispatch_time
 * @param startDate
 * @param endDate
 * @returns {Promise}
 */
exports.exportDetailList= function(org_id,proc_code,level,status,dispatch_time,startDate,endDate,proc_inst_task_type) {

    var p = new Promise(function(resolve,reject){

        //查询统计表
        var statistics={};
        if(level==2){
            statistics['province_id']=new mongoose.Types.ObjectId(org_id);
        } else if(level==3){
            //地市
            statistics['city_id']=new mongoose.Types.ObjectId(org_id);
        } else if(level==4){
            //区县
            statistics['county_id']=new mongoose.Types.ObjectId(org_id);
        } else if(level==5){
            //网格
            statistics['grid_id']=new mongoose.Types.ObjectId(org_id);
        }else if(level==6){
            //渠道
            statistics['channel_id']=new mongoose.Types.ObjectId(org_id);
        }
        //流程编码
        var two_histroy={};
        //流程编码
        if(proc_code){
            statistics['proc_code']=proc_code;
            if(proc_code=='p-109'){
                two_histroy={"proc_inst_task_type" : "网格经理审核"}
            }else{
                two_histroy={"proc_inst_task_type" : "省营业厅销售部稽核"}
            }
        }
        //派单时间
        if(dispatch_time){
            statistics['dispatch_time']=dispatch_time.replace(/\-/g,'');
        }
        var compare={};
        //开始时间
        if(startDate){
            compare['$gte']=new Date(startDate);
        }
        //结束时间
        if(endDate){
            //结束时间追加至当天的最后时间
            compare['$lte']=new Date(endDate+' 23:59:59');
        }
        //时间查询
        if(!isEmptyObject(compare)){
            statistics['insert_time']=compare;
        }

        //查询实例
        var inst_match={};
        //总数
        if(status==1){
            inst_match={"inst.proc_inst_status":{$in:[1,2,3,4]}};
        }
        //归档数
        if(status==2){
            inst_match={"inst.proc_inst_status":{$in:[4]}};
        }
        //未超时档数
        if(status==3){
            inst_match={"inst.is_overtime":0,"inst.proc_inst_status":4};
        }

        var task_flag=true;
        var task_search={"proc_inst_task_status":0}
        if(proc_inst_task_type){
            if(proc_inst_task_type=='complete'){
                inst_match={"inst.proc_inst_status":{$in:[4]}};
            }else{
                task_search.proc_inst_task_type=proc_inst_task_type;
                task_flag=false;
            }

        }
        console.log("task_search",task_search,proc_inst_task_type=='complete');
        console.log("statistics",statistics);
        //依机构表为主表，关联统计表和实例表
        process_extend_model.$ProcessTaskStatistics.aggregate([
            {
                $match: statistics
            },
            {
                $lookup: {
                    from: "common_bpm_proc_inst",
                    localField: 'proc_inst_id',
                    foreignField: "_id",
                    as: "inst"
                }
            },
            {
                $match: inst_match
            },

            {
                $unwind : { path: "$inst", preserveNullAndEmptyArrays: true }
            },
            {
                $graphLookup: {
                    from: "common_bpm_proc_inst_task",
                    startWith: "$proc_inst_id",
                    connectFromField: "proc_inst_id",
                    connectToField: "proc_inst_id",
                    as: "task",
                    restrictSearchWithMatch: task_search
                }
            },
            {
                $unwind : { path: "$task", preserveNullAndEmptyArrays: task_flag }
            },
            {
                $graphLookup: {
                    from: "common_bpm_proc_task_histroy",
                    startWith: "$proc_inst_id",
                    connectFromField: "proc_inst_id",
                    connectToField: "proc_inst_id",
                    as: "channel_histroy",
                    restrictSearchWithMatch: {"proc_inst_task_type" : "厅店处理回复"}
                }
            },
            {
                $graphLookup: {
                    from: "common_bpm_proc_task_histroy",
                    startWith: "$proc_inst_id",
                    connectFromField: "proc_inst_id",
                    connectToField: "proc_inst_id",
                    as: "two_histroy",
                    restrictSearchWithMatch: two_histroy
                }
            },
            {
                $addFields: {
                    proc_title:  "$inst.proc_title",
                    proc_name: "$inst.proc_name",
                    proc_vars: "$inst.proc_vars",
                    proc_start_time: "$inst.proc_start_time",
                    proc_start_user_name: "$inst.proc_start_user_name",
                    proc_inst_task_type: "$task.proc_inst_task_type",
                    work_order_number: "$inst.work_order_number",
                    proc_inst_task_assignee_name:  "$task.proc_inst_task_assignee_name",
                    proc_inst_status:  "$inst.proc_inst_status",
                    channel_histroy:  "$channel_histroy.proc_inst_task_remark",
                }
            }
        ]).exec(function(err,res){
            if(err){
                reject(utils.returnMsg(false, '1000', '查询统计失败。',null,err));
            }else{

                resolve({"data":res,"proc_code":proc_code});
            }
        })

    });

    return p;
};


/**
 * 创建excel文件
 */
function createExcelOrderList(list) {
    const headers = [
        '区域名称',
        '工单数',
        '归档工单数',
        '未超时归档工单数',
    ];

    var data = [headers];

    list.map(c=>{
        const tmp = [
            c.org_fullname,
            c.total,
            c.success,
            c.overtime,
        ]

        data.push(tmp);
    });
    var ws = {
        s:{
            "!row" : [{wpx: 67}]
        }
    };
    ws['!cols']= [{wpx: 300},{wpx: 100},{wpx: 100},{wpx: 100}];


    return xlsx.build([{name:'Sheet1',data:data}],ws);
}

exports.createExcelOrderList = createExcelOrderList;




exports.createExcelOrderDetail =function createExcelOrderDetail(data) {
    let list=data.data;
    let proc_code=data.proc_code;
    const headers =  [
        '工单编号',
        '标题',
        '派单内容',
        '类型',
        '当前处理人',
        '当前状态',
        '创建时间',
        '工单发起人',
        '渠道ID',
        '渠道名称',
        '渠道负责人',
        '渠道负责人手机号码',
         '渠道处理意见'
    ];
    if(proc_code=='p-109'){
        headers.push("网格编码");
        headers.push("网格名称");
        headers.push("网格负责人");
        headers.push("网格负责人手机号码");
        headers.push("网格处理人意见");
    }else{
        headers.push("省级稽核处理人");
        headers.push("省级稽核处理人手机号码");
        headers.push("省级稽核处理人意见");
    }

    var data = [headers];

    list.map(c=>{
        const tmp = [
            c.work_order_number,
            c.proc_title,
            JSON.parse(c.proc_vars).remark,
            c.proc_name,
            !c.proc_inst_task_assignee_name? "已归档" : c.proc_inst_task_assignee_name,
            !c.proc_inst_task_type?  "已归档" : c.proc_inst_task_type,
            c.proc_start_time,
            c.proc_start_user_name,
            c.channel_code,
            c.channel_name,
            c.user_name,
            c.user_phone,
            c.channel_histroy ? c.channel_histroy[0] : ""
        ]
        if(proc_code=='p-109'){
            tmp.push(JSON.parse(c.proc_vars).grid_code);
            tmp.push(JSON.parse(c.proc_vars).grid_name);
            tmp.push((c.two_histroy  && c.two_histroy.length > 0 )? c.two_histroy[0].proc_inst_task_assignee_name :'');
            tmp.push((c.two_histroy  && c.two_histroy.length > 0 )? c.two_histroy[0].proc_inst_task_assignee :'');
            tmp.push((c.two_histroy  && c.two_histroy.length > 0 )? c.two_histroy[0].proc_inst_task_remark :'');
        }else{
            tmp.push((c.two_histroy  && c.two_histroy.length > 0 )? c.two_histroy[0].proc_inst_task_assignee_name :'');
            tmp.push((c.two_histroy  && c.two_histroy.length > 0 )? c.two_histroy[0].proc_inst_task_assignee :'');
            tmp.push((c.two_histroy  && c.two_histroy.length > 0 )? c.two_histroy[0].proc_inst_task_remark :'');
        }
        data.push(tmp);
    });
    var ws = {
        s:{
            "!row" : [{wpx: 67}]
        }
    };
    ws['!cols']= [{wpx: 130},{wpx: 400},{wpx: 600},{wpx: 100},{wpx: 100},{wpx: 100},{wpx: 100},{wpx: 150},{wpx: 100},{wpx: 400},{wpx: 100},{wpx: 150}];
    if(proc_code){
        ws['!cols'].push({wpx: 130});
        ws['!cols'].push({wpx: 130});
        ws['!cols'].push({wpx: 130});
        ws['!cols'].push({wpx: 130});
        ws['!cols'].push({wpx: 180});
    }else{
        ws['!cols'].push({wpx: 130});
        ws['!cols'].push({wpx: 130});
        ws['!cols'].push({wpx: 180});
    }
    return xlsx.build([{name:'Sheet1',data:data}],ws);
}


/**
 * 获取上级机构
 * @param org_id
 */
exports.pre_org= function(org_id) {

    return new Promise(function(resolve,reject){
        user_model.$CommonCoreOrg.find({"_id":org_id},function(err,res){
            if(err){
                reject(utils.returnMsg(false, '1000', '查询上级机构失败。',null,err));
            }else{
                if(res.length==1){
                    resolve(utils.returnMsg(true, '2000', res[0],null,null));
                }else{
                    reject(utils.returnMsg(false, '1000', '查询上级机构失败。',null,null));
                }
            }
        })
    });

};


/**
 * 查询详细列表
 * @param org_id
 * @param status
 * @param proc_code
 * @param dispatch_time
 * @param startDate
 * @param endDate
 * @returns {Promise}
 */
exports.detail_list= function(page,size,org_id,level,status,proc_code,dispatch_time,startDate,endDate,proc_inst_task_type) {

    var p = new Promise(function(resolve,reject){
        page=parseInt(page);
        size=parseInt(size);
        if(page==0){
            page=1;
        }
        //查询统计表
        var statistics={};
        if(level==2){
            statistics['province_id']=new mongoose.Types.ObjectId(org_id);
        } else if(level==3){
            //地市
            statistics['city_id']=new mongoose.Types.ObjectId(org_id);
        } else if(level==4){
            //区县
            statistics['county_id']=new mongoose.Types.ObjectId(org_id);
        } else if(level==5){
            //网格
            statistics['grid_id']=new mongoose.Types.ObjectId(org_id);
        }else if(level==6){
            //渠道
            statistics['channel_id']=new mongoose.Types.ObjectId(org_id);
        }
        var two_histroy={};
        //流程编码
        if(proc_code){
            statistics['proc_code']=proc_code;
            if(proc_code=='p-109'){
                two_histroy={"proc_inst_task_type" : "网格经理审核"}
            }else{
                two_histroy={"proc_inst_task_type" : "省营业厅销售部稽核"}
            }
        }
        //派单时间
        if(dispatch_time){
            statistics['dispatch_time']=dispatch_time.replace(/\-/g,'');
        }
        var compare={};
        //开始时间
        if(startDate){
            compare['$gte']=new Date(startDate);
        }
        //结束时间
        if(endDate){
            //结束时间追加至当天的最后时间
            compare['$lte']=new Date(endDate+' 23:59:59');
        }
        //时间查询
        if(!isEmptyObject(compare)){
            statistics['insert_time']=compare;
        }
        var task_flag=true;
        //查询实例
        var inst_match={};
        //总数
        if(status==1){
            inst_match={"inst.proc_inst_status":{$in:[1,2,3,4]}};
        }
        //归档数
        if(status==2){
            inst_match={"inst.proc_inst_status":{$in:[4]}};
        }
        //未超时归档数
        if(status==3){
            inst_match={"inst.is_overtime":0,"inst.proc_inst_status":4};

        }

        var task_search={"proc_inst_task_status":0}
        if(proc_inst_task_type){
            if(proc_inst_task_type=='complete'){
                inst_match={"inst.proc_inst_status":{$in:[4]}};
            }else{
                task_search.proc_inst_task_type=proc_inst_task_type;
                task_flag=false;
            }
        }
        console.log("task_search",task_search);
        console.log("statistics",statistics);
        //依机构表为主表，关联统计表和实例表
        process_extend_model.$ProcessTaskStatistics.aggregate([
            {
                $match: statistics
            },
            {
                $lookup: {
                    from: "common_bpm_proc_inst",
                    localField: 'proc_inst_id',
                    foreignField: "_id",
                    as: "inst"
                }
            },
            {
                $match: inst_match
            },

            {
                $unwind : { path: "$inst", preserveNullAndEmptyArrays: true }
            },
            {
                $graphLookup: {
                    from: "common_bpm_proc_inst_task",
                    startWith: "$proc_inst_id",
                    connectFromField: "proc_inst_id",
                    connectToField: "proc_inst_id",
                    as: "task",
                    restrictSearchWithMatch: task_search
                }
            },
            {
                $unwind : { path: "$task", preserveNullAndEmptyArrays: task_flag }
            },
            {
                $graphLookup: {
                    from: "common_bpm_proc_task_histroy",
                    startWith: "$proc_inst_id",
                    connectFromField: "proc_inst_id",
                    connectToField: "proc_inst_id",
                    as: "channel_histroy",
                    restrictSearchWithMatch: {"proc_inst_task_type" : "厅店处理回复"}
                }
            },
            {
                $graphLookup: {
                    from: "common_bpm_proc_task_histroy",
                    startWith: "$proc_inst_id",
                    connectFromField: "proc_inst_id",
                    connectToField: "proc_inst_id",
                    as: "two_histroy",
                    restrictSearchWithMatch: two_histroy
                }
            },

            {
                $addFields: {
                    proc_title:  "$inst.proc_title",
                    proc_name: "$inst.proc_name",
                    proc_vars: "$inst.proc_vars",
                    proc_start_time: "$inst.proc_start_time",
                    proc_start_user_name: "$inst.proc_start_user_name",
                    proc_inst_task_type: "$task.proc_inst_task_type",
                    work_order_number: "$inst.work_order_number",
                    proc_inst_task_assignee_name:  "$task.proc_inst_task_assignee_name",
                    proc_inst_status:  "$inst.proc_inst_status",
                    channel_histroy:  "$channel_histroy.proc_inst_task_remark",

            }
            },
            {
                $skip : (page - 1) * size
            },
            {
                $limit : size
            },
        ]).exec(function(err,res){
            if(err){
                reject(utils.returnMsg(false, '1000', '查询统计失败。',null,err));
            }else{
                console.log(res);
                var result={rows:res,success:true};
                //计算总数
                process_extend_model.$ProcessTaskStatistics.aggregate([
                    {
                        $match: statistics
                    },
                    {
                        $lookup: {
                            from: "common_bpm_proc_inst",
                            localField: 'proc_inst_id',
                            foreignField: "_id",
                            as: "inst"
                        }
                    },
                    {
                        $match: inst_match
                    },
                    {
                        $unwind : { path: "$inst", preserveNullAndEmptyArrays: true }
                    },
                    {
                        $graphLookup: {
                            from: "common_bpm_proc_inst_task",
                            startWith: "$proc_inst_id",
                            connectFromField: "proc_inst_id",
                            connectToField: "proc_inst_id",
                            as: "task",
                            restrictSearchWithMatch: task_search
                        }
                    },
                    {
                        $unwind : { path: "$task", preserveNullAndEmptyArrays: task_flag }
                    },
                    {
                        $addFields: {
                            proc_title:  "$inst.proc_title",
                            proc_name: "$inst.proc_name",
                            proc_vars: "$inst.proc_vars",
                            work_order_number: "$inst.work_order_number",
                            proc_start_time: "$inst.proc_start_time",
                            proc_start_user_name: "$inst.proc_start_user_name",
                            proc_inst_task_type: "$task.proc_inst_task_type",
                            proc_inst_task_assignee_name:  "$task.proc_inst_task_assignee_name",
                            proc_inst_status:  "$inst.proc_inst_status",
                        }
                    },
                    {
                        $group: {
                            _id : null,
                            count:{$sum:1}
                        }
                    }
                ]).exec(function(err,res){
                    if(err){
                        reject(utils.returnMsg(false, '1000', '查询统计失败。',null,err));
                    }else{
                        if(res.length==0){
                            result.total=0;
                        }else{
                            result.total=res[0].count;
                        }

                        resolve(result);

                    }
                })
            }
        })

    });

    return p;
};

/**
 * 获取当前登录账号的机构id和区域级别
 * @param user_org
 * @returns {{}}
 */
exports.local_user= function(user_org,user_no) {
    return new Promise(function(resolve,reject){
        var return_json={};
        if(user_no != 'admin'){
            if(user_org.length>0){
                var level;
                var org_id;
                for(let item in user_org){
                    var org=user_org[item];
                    if(level){
                        if(org.level < level){
                            level=org.level;
                            org_id=org._id;
                        }
                    }else{
                        level=org.level;
                        org_id=org._id;
                    }
                }
                var data={level:level,org_id:org_id};
                return_json.success=true;
                return_json.data=data;
                resolve(return_json) ;
            }else{
                return_json.success=false;
                return_json.msg='当前账号无机构';
                resolve(return_json) ;
            }
        }else{
            var data={level:2,org_id:'5a275c0377ec2e1e844878dd'};
            return_json.success=true;
            return_json.data=data;
            resolve(return_json) ;
        }
    })

}




function isEmptyObject(e) {
    var t;
    for (t in e)
        return !1;
    return !0
}